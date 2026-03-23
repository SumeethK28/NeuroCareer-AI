-- Migration SQL for NeuroCareer AI Database
-- This migration converts from GitHub OAuth to Email/Password authentication
-- Run this in your Neon console or PostgreSQL client

-- Step 1: Create the new 'users' table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Step 2: Update ApplicationLog table to use user_id instead of github_id
-- (If not already updated)
ALTER TABLE application_logs
ADD COLUMN IF NOT EXISTS user_id INTEGER,
ADD CONSTRAINT fk_application_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 3: Update ReflectionRecord table to use user_id instead of github_id
-- (If not already updated)
ALTER TABLE reflection_records
ADD COLUMN IF NOT EXISTS user_id INTEGER,
ADD CONSTRAINT fk_reflection_records_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 4: Update UserSkill table to use user_id instead of github_id
-- (If not already updated)
ALTER TABLE user_skills
ADD COLUMN IF NOT EXISTS user_id INTEGER,
ADD CONSTRAINT fk_user_skills_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill ON user_skills(skill);

-- Step 5: Create ResumeAnalysis table if it doesn't exist
CREATE TABLE IF NOT EXISTS resume_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    summary TEXT,
    retained_skills JSON,
    missing_skills JSON,
    recommended_actions JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_resume_analyses_user_id ON resume_analyses(user_id);

-- Step 6: Drop old user_profiles table if it exists
-- BACKUP YOUR DATA FIRST!
-- DROP TABLE IF EXISTS user_profiles CASCADE;

-- Step 7: Verify tables and relationships
-- SELECT * FROM information_schema.tables WHERE table_name IN ('users', 'application_logs', 'reflection_records', 'user_skills', 'resume_analyses');
