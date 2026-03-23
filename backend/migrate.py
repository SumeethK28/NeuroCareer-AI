#!/usr/bin/env python
"""Direct database migration to add ghosting_risk_score and last_recruiter_activity columns."""

import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:password@localhost/neurocareer"
)

async def migrate():
    """Add missing columns to application_logs table."""
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        # Check if columns already exist and add them if not
        print("Adding ghosting_risk_score column...")
        try:
            await conn.execute(
                text("""
                    ALTER TABLE application_logs 
                    ADD COLUMN ghosting_risk_score FLOAT DEFAULT 0.0;
                """)
            )
            print("✓ ghosting_risk_score column added")
        except Exception as e:
            if "already exists" in str(e):
                print("✓ ghosting_risk_score column already exists")
            else:
                print(f"✗ Error adding ghosting_risk_score: {e}")
        
        print("Adding last_recruiter_activity column...")
        try:
            await conn.execute(
                text("""
                    ALTER TABLE application_logs 
                    ADD COLUMN last_recruiter_activity TIMESTAMP WITH TIME ZONE;
                """)
            )
            print("✓ last_recruiter_activity column added")
        except Exception as e:
            if "already exists" in str(e):
                print("✓ last_recruiter_activity column already exists")
            else:
                print(f"✗ Error adding last_recruiter_activity: {e}")
        
        await conn.commit()
    
    await engine.dispose()
    print("\n✅ Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
