from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Sequence

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import MemoryUnavailableError
from app.core.security import AuthContext
from app.db.models import ApplicationLog, User, UserSkill
from app.schemas import SkillTreeNode
from app.services.hindsight_client import HindsightMemoryClient


class RadarService:
    """Career Opportunity Radar - detects momentum, ghosting risk, and next-best actions."""

    def __init__(self, memory_client: HindsightMemoryClient):
        self._client = memory_client
        self._log = structlog.get_logger(__name__)

    async def generate_radar_data(
        self,
        session: AsyncSession,
        auth: AuthContext,
        applications: Sequence[ApplicationLog],
        skills: Sequence[UserSkill],
    ) -> dict[str, Any]:
        """Generate comprehensive radar data for career opportunity analysis."""
        try:
            profile = await session.scalar(
                select(UserProfile).where(UserProfile.github_id == auth.user_id)
            )
            if not profile:
                return self._empty_radar()

            ghosting_list = self._identify_ghosting_applications(applications)
            momentum_score = self._calculate_momentum_score(applications)
            missing_skills = await self._identify_missing_skills(auth.user_id, applications, skills)
            next_actions = self._generate_next_actions(applications, missing_skills, ghosting_list)

            return {
                "momentum_score": momentum_score,
                "ghosting_list": ghosting_list,
                "missing_skills": missing_skills,
                "next_actions": next_actions,
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as exc:
            self._log.warning("radar.generation_failed", user_id=auth.user_id, error=str(exc))
            return self._empty_radar()

    def _identify_ghosting_applications(self, applications: Sequence[ApplicationLog]) -> list[dict[str, Any]]:
        """Identify applications likely to be ghosted (no activity for 30+ days)."""
        ghosting = []
        now = datetime.utcnow().replace(tzinfo=None)

        for app in applications:
            if app.status in {"rejected", "ghosted"}:
                continue

            # Check last activity
            last_activity = app.last_recruiter_activity or app.updated_at
            if not last_activity:
                last_activity = app.created_at

            # Remove timezone for comparison
            if last_activity.tzinfo:
                last_activity = last_activity.replace(tzinfo=None)

            days_silent = (now - last_activity).days

            # Calculate ghosting risk
            risk_score = min(100, (days_silent / 30) * 100)

            if days_silent >= 14:  # Flag after 2 weeks of silence
                ghosting.append({
                    "id": app.id,
                    "company": app.company,
                    "role": app.role,
                    "status": app.status,
                    "days_silent": days_silent,
                    "ghosting_risk": round(risk_score),
                    "last_activity": last_activity.isoformat(),
                    "action": "Archive" if days_silent >= 60 else "Follow Up",
                })

        return sorted(ghosting, key=lambda x: x["days_silent"], reverse=True)

    @staticmethod
    def _calculate_momentum_score(applications: Sequence[ApplicationLog]) -> dict[str, Any]:
        """Calculate momentum based on application frequency and response rate."""
        if not applications:
            return {
                "score": 0,
                "trend": "neutral",
                "applications_this_month": 0,
                "response_rate": 0.0,
                "insight": "Start applying to build momentum.",
            }

        now = datetime.utcnow().replace(tzinfo=None)
        month_ago = now - timedelta(days=30)

        recent_apps = [
            app
            for app in applications
            if (app.created_at.replace(tzinfo=None) if app.created_at.tzinfo else app.created_at)
            >= month_ago
        ]

        responded = [
            app for app in recent_apps if app.status in {"interview", "offer", "rejected"}
        ]

        response_rate = (len(responded) / len(recent_apps) * 100) if recent_apps else 0
        num_apps = len(recent_apps)

        # Score: 0-100 based on apps this month and response rate
        score = min(100, (num_apps * 5) + response_rate)

        trend = "rising" if num_apps >= 3 else "falling" if num_apps == 0 else "steady"
        insight = (
            "Great momentum! Keep applying."
            if score >= 70
            else "Steady progress. Increase applications."
            if score >= 40
            else "Build momentum with more applications."
        )

        return {
            "score": round(score),
            "trend": trend,
            "applications_this_month": num_apps,
            "response_rate": round(response_rate, 1),
            "insight": insight,
        }

    async def _identify_missing_skills(
        self,
        user_id: str,
        applications: Sequence[ApplicationLog],
        skills: Sequence[UserSkill],
    ) -> list[dict[str, Any]]:
        """Compare rejected applications against skill tree to find gaps."""
        rejected_apps = [app for app in applications if app.status == "rejected"]
        if not rejected_apps:
            return []

        # Get user's current skills
        user_skills = {skill.skill.lower() for skill in skills}

        # Extract skills from rejected job descriptions
        missing_by_company = {}
        for app in rejected_apps:
            if not app.job_description:
                continue

            # Try to use Hindsight to analyze job description
            try:
                analysis = await self._client.recall(
                    user_id,
                    query=f"skills required for {app.role} at {app.company}",
                    options={"limit": 5},
                )

                # Extract mentioned skills
                mentioned_skills = set()
                for item in analysis.get("results", []):
                    content = str(item.get("content", "")).lower()
                    for skill in user_skills:
                        if skill in content:
                            mentioned_skills.add(skill)

                # Infer missing (rough heuristic based on keywords in description)
                description_lower = app.job_description.lower()
                common_tech = {
                    "docker", "kubernetes", "aws", "gcp", "azure", "terraform",
                    "ci/cd", "jenkins", "gitlab", "github actions",
                    "machine learning", "nlp", "computer vision",
                }

                for tech in common_tech:
                    if tech in description_lower and tech not in user_skills:
                        missing_by_company.setdefault(app.company, []).append(tech)
            except MemoryUnavailableError:
                # Fallback: simple keyword matching
                description_lower = app.job_description.lower()
                keywords = [
                    "docker", "kubernetes", "terraform", "ci/cd",
                    "machine learning", "nlp", "data pipeline",
                ]
                for keyword in keywords:
                    if keyword in description_lower and keyword not in user_skills:
                        missing_by_company.setdefault(app.company, []).append(keyword)

        # Aggregate and deduplicate
        missing_skills = {}
        for company, skills_list in missing_by_company.items():
            for skill in set(skills_list):
                if skill not in missing_skills:
                    missing_skills[skill] = []
                missing_skills[skill].append(company)

        result = []
        for skill, companies in sorted(missing_skills.items(), key=lambda x: len(x[1]), reverse=True):
            result.append({
                "skill": skill,
                "appeared_in": companies[:3],  # Top 3 companies
                "frequency": len(companies),
                "priority": "high" if len(companies) >= 2 else "medium",
            })

        return result[:5]  # Top 5 missing skills

    @staticmethod
    def _generate_next_actions(
        applications: Sequence[ApplicationLog],
        missing_skills: list[dict[str, Any]],
        ghosting_list: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Generate actionable recommendations."""
        actions = []

        # Action 1: Follow up on ghosting
        if ghosting_list:
            app = ghosting_list[0]
            actions.append({
                "priority": "high",
                "action": "Follow-up Email",
                "description": f"Reach out to {app['company']} about your {app['role']} application.",
                "impact": "Re-engage recruiter",
            })

        # Action 2: Learn missing skills
        if missing_skills:
            top_skill = missing_skills[0]
            companies = ", ".join(top_skill["appeared_in"][:2])
            actions.append({
                "priority": "high",
                "action": "Skill Development",
                "description": f"Learn {top_skill['skill']} (needed by {companies}).",
                "impact": "Increase interview chances",
            })

        # Action 3: Update portfolio
        if applications:
            rejected_count = sum(1 for app in applications if app.status == "rejected")
            if rejected_count > 0:
                actions.append({
                    "priority": "medium",
                    "action": "Update Portfolio",
                    "description": "Add a project showcasing your strongest 2-3 skills.",
                    "impact": "Stand out to recruiters",
                })

        # Action 4: Apply more
        this_month = sum(
            1
            for app in applications
            if (app.created_at.replace(tzinfo=None) if app.created_at.tzinfo else app.created_at)
            >= (datetime.utcnow().replace(tzinfo=None) - timedelta(days=30))
        )
        if this_month < 3:
            actions.append({
                "priority": "medium",
                "action": "Increase Applications",
                "description": "Apply to 3-5 more positions this week.",
                "impact": "Build interview pipeline",
            })

        # Action 5: Network
        if not actions or len(actions) < 5:
            actions.append({
                "priority": "low",
                "action": "Network Strategically",
                "description": "Connect with engineers at your target companies on LinkedIn.",
                "impact": "Get referrals",
            })

        return actions[:5]  # Top 5 actions

    @staticmethod
    def _empty_radar() -> dict[str, Any]:
        return {
            "momentum_score": {"score": 0, "trend": "neutral", "applications_this_month": 0},
            "ghosting_list": [],
            "missing_skills": [],
            "next_actions": [],
            "timestamp": datetime.utcnow().isoformat(),
        }
