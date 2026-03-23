-- Drop old table and relationships
ALTER TABLE application_logs DROP CONSTRAINT IF EXISTS application_logs_user_id_fkey;
ALTER TABLE reflection_records DROP CONSTRAINT IF EXISTS reflection_records_user_id_fkey;
ALTER TABLE user_skills DROP CONSTRAINT IF EXISTS user_skills_user_id_fkey;
ALTER TABLE resume_analyses DROP CONSTRAINT IF EXISTS resume_analyses_user_id_fkey;

DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create new users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Add foreign keys
ALTER TABLE application_logs 
    ADD CONSTRAINT application_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE reflection_records 
    ADD CONSTRAINT reflection_records_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_skills 
    ADD CONSTRAINT user_skills_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE resume_analyses 
    ADD CONSTRAINT resume_analyses_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;