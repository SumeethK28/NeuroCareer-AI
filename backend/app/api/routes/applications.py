from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import RequireAuth, get_db_session, get_memory_service
from app.core.security import AuthContext
from app.db.models import ApplicationLog, User, UserSkill
from app.schemas import ApplicationInsightsResponse, ApplicationLogRequest, ApplicationLogResponse, ApplicationLogItem
from app.services.hindsight_client import HindsightMemoryClient
from app.services.memory import MemoryService
from app.services.radar import RadarService

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.post("/", status_code=201)
async def log_application(
    payload: ApplicationLogRequest,
    auth: AuthContext = RequireAuth,
    session: AsyncSession = Depends(get_db_session),
    memory_service: MemoryService = Depends(get_memory_service),
) -> dict[str, str]:
    try:
        result = await memory_service.log_application(
            session=session,
            auth=auth,
            company=payload.company,
            role=payload.role,
            status=payload.status,
            job_description=payload.job_description,
            notes=payload.notes,
        )
    except (SQLAlchemyError, OSError) as exc:
        logger.warning("database.log_application_failed", user_id=auth.user_id, error=str(exc))
        return {"message": "Application retained in memory, database currently unavailable."}
    if result is None:
        return {"message": "Application retained in memory, database currently unavailable."}
    return {"message": "Application recorded."}


@router.get("/ghosting", response_model=ApplicationInsightsResponse)
async def ghosting_insights(
    auth: AuthContext = RequireAuth,
    memory_service: MemoryService = Depends(get_memory_service),
) -> ApplicationInsightsResponse:
    return await memory_service.fetch_ghosting_insights(auth)


@router.get("/smart/analysis")
async def smart_application_analysis(
    auth: AuthContext = RequireAuth,
    session: AsyncSession = Depends(get_db_session),
    memory_service: MemoryService = Depends(get_memory_service),
) -> dict:
    """AI-powered smart analysis of all applications."""
    try:
        from datetime import datetime, timedelta
        
        # Fetch all applications for the user
        app_result = await session.execute(
            select(ApplicationLog)
            .where(ApplicationLog.user_id == auth.user_id)
            .order_by(ApplicationLog.created_at.desc())
        )
        applications = app_result.scalars().all()

        if not applications:
            return {
                "summary": "No applications tracked yet. Start logging your applications to get AI insights.",
                "applications_analysis": [],
                "overall_health": "green",
                "stats": {
                    "total_applications": 0,
                    "active": 0,
                    "under_review": 0,
                    "ghosted_or_rejected": 0,
                },
                "recommendations": [],
            }

        # Analyze each application
        now = datetime.utcnow()
        analyzed_apps = []

        for app in applications:
            # Calculate days since application
            app_created = app.created_at.replace(tzinfo=None) if app.created_at.tzinfo else app.created_at
            days_since = (now - app_created).days
            
            # Determine application health
            if app.status in {"rejected", "ghosted"}:
                health = "red"
                status_label = "Rejected" if app.status == "rejected" else "Ghosted"
            elif app.status == "offer":
                health = "green"
                status_label = "Offer"
            elif app.status == "interview":
                health = "yellow"
                status_label = "Interview"
            elif app.status == "pending" or app.status == "applied":
                # Check for ghosting
                last_activity = app.last_recruiter_activity or app.updated_at
                last_activity = last_activity.replace(tzinfo=None) if last_activity.tzinfo else last_activity
                days_silent = (now - last_activity).days
                
                if days_silent >= 30:
                    health = "red"
                    status_label = "Likely Ghosted"
                elif days_silent >= 14:
                    health = "yellow"
                    status_label = "Under Review (No Recent Activity)"
                else:
                    health = "green"
                    status_label = "Active"
            else:
                health = "gray"
                status_label = app.status.capitalize()

            last_activity_date = app.last_recruiter_activity or app.updated_at
            last_activity_str = last_activity_date.isoformat() if last_activity_date else "Unknown"

            analyzed_apps.append({
                "id": app.id,
                "company": app.company,
                "role": app.role,
                "status": status_label,
                "health": health,
                "days_since_application": days_since,
                "last_activity": last_activity_str,
            })

        # Generate overall health
        green_count = sum(1 for a in analyzed_apps if a["health"] == "green")
        red_count = sum(1 for a in analyzed_apps if a["health"] == "red")
        yellow_count = sum(1 for a in analyzed_apps if a["health"] == "yellow")

        if red_count > len(analyzed_apps) * 0.5:
            overall_health = "red"
            health_message = "Concerning - Many applications are ghosted or rejected"
        elif yellow_count > len(analyzed_apps) * 0.5:
            overall_health = "yellow"
            health_message = "Mixed - Some applications are stalled, but progress ongoing"
        else:
            overall_health = "green"
            health_message = "Good - Applications are progressing well"

        # Generate recommendations
        recommendations = []
        
        if red_count > 0:
            recommendations.append(
                f"⚠️ {red_count} application(s) appear to be ghosted. Consider reaching out to recruiters or applying to similar roles."
            )
        
        if yellow_count > len(analyzed_apps) * 0.3:
            recommendations.append(
                "📧 Several applications are under review without recent activity. Follow up with recruiters professionally."
            )
        
        if len(analyzed_apps) < 3:
            recommendations.append(
                "📝 Increase your application volume. Aim for 5-10 applications per week for better odds."
            )
        
        if green_count > 0:
            recommendations.append(
                f"✅ Great! You have {green_count} active/positive application(s). Keep this momentum!"
            )

        return {
            "summary": health_message,
            "applications_analysis": analyzed_apps,
            "overall_health": overall_health,
            "stats": {
                "total_applications": len(analyzed_apps),
                "active": green_count,
                "under_review": yellow_count,
                "ghosted_or_rejected": red_count,
            },
            "recommendations": recommendations,
        }
    except Exception as exc:
        logger.warning("smart_analysis_failed", user_id=auth.user_id, error=str(exc))
        return {
            "summary": "Error analyzing applications",
            "applications_analysis": [],
            "overall_health": "gray",
            "stats": {
                "total_applications": 0,
                "active": 0,
                "under_review": 0,
                "ghosted_or_rejected": 0,
            },
            "recommendations": [],
        }

@router.get("/", response_model=ApplicationLogResponse)
async def list_applications(
    auth: AuthContext = RequireAuth,
    session: AsyncSession = Depends(get_db_session),
    memory_service: MemoryService = Depends(get_memory_service),
) -> ApplicationLogResponse:
    try:
        result = await session.execute(
            select(ApplicationLog)
            .where(ApplicationLog.user_id == auth.user_id)
            .order_by(ApplicationLog.created_at.desc())
            .limit(50)
        )
        rows = result.scalars().all()
        return ApplicationLogResponse(
            applications=[
                ApplicationLogItem(
                    id=row.id,
                    company=row.company,
                    role=row.role,
                    status=row.status,
                    applied_at=row.created_at,
                    job_description=row.job_description,
                    notes=row.notes,
                )
                for row in rows
            ]
        )
    except (SQLAlchemyError, OSError) as exc:
        logger.warning("database.list_applications_failed", user_id=auth.user_id, error=str(exc))
        return ApplicationLogResponse(applications=[])


@router.get("/radar/analyze")
async def analyze_career_radar(
    auth: AuthContext = RequireAuth,
    session: AsyncSession = Depends(get_db_session),
    memory_service: MemoryService = Depends(get_memory_service),
) -> dict:
    """Generate Career Opportunity Radar analysis."""
    try:
        # Fetch applications
        app_result = await session.execute(
            select(ApplicationLog)
            .where(ApplicationLog.user_id == auth.user_id)
            .order_by(ApplicationLog.created_at.desc())
        )
        applications = app_result.scalars().all()

        # Fetch skills
        skill_result = await session.execute(
            select(UserSkill).where(UserSkill.user_id == auth.user_id)
        )
        skills = skill_result.scalars().all()

        # Generate radar
        radar_service = RadarService(memory_service._client)
        radar_data = await radar_service.generate_radar_data(session, auth, applications, skills)

        return radar_data
    except (SQLAlchemyError, OSError) as exc:
        logger.warning("radar.analysis_failed", user_id=auth.user_id, error=str(exc))
        return {
            "momentum_score": {"score": 0, "trend": "neutral"},
            "ghosting_list": [],
            "missing_skills": [],
            "next_actions": [],
        }


@router.put("/{app_id}", status_code=200)
async def update_application(
    app_id: int,
    payload: ApplicationLogRequest,
    auth: AuthContext = RequireAuth,
    session: AsyncSession = Depends(get_db_session),
    memory_service: MemoryService = Depends(get_memory_service),
) -> dict[str, str]:
    try:
        result = await session.execute(
            select(ApplicationLog).where(
                (ApplicationLog.id == app_id) & (ApplicationLog.user_id == auth.user_id)
            )
        )
        app = result.scalar_one_or_none()
        if not app:
            return {"message": "Application not found."}

        app.company = payload.company
        app.role = payload.role
        app.status = payload.status
        app.job_description = payload.job_description
        app.notes = payload.notes

        await session.commit()
        return {"message": "Application updated."}
    except (SQLAlchemyError, OSError) as exc:
        await session.rollback()
        logger.warning("database.update_application_failed", user_id=auth.user_id, error=str(exc))
        return {"message": "Failed to update application."}


@router.delete("/{app_id}", status_code=200)
async def delete_application(
    app_id: int,
    auth: AuthContext = RequireAuth,
    session: AsyncSession = Depends(get_db_session),
    memory_service: MemoryService = Depends(get_memory_service),
) -> dict[str, str]:
    try:
        result = await session.execute(
            select(ApplicationLog).where(
                (ApplicationLog.id == app_id) & (ApplicationLog.user_id == auth.user_id)
            )
        )
        app = result.scalar_one_or_none()
        if not app:
            return {"message": "Application not found."}

        await session.delete(app)
        await session.commit()
        return {"message": "Application deleted."}
    except (SQLAlchemyError, OSError) as exc:
        await session.rollback()
        logger.warning("database.delete_application_failed", user_id=auth.user_id, error=str(exc))
        return {"message": "Failed to delete application."}

