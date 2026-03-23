# Setup Guide - NeuroCareer AI

Complete step-by-step guide to setup and run NeuroCareer AI locally.

## Prerequisites

Before you begin, ensure you have:

### Required Software
- **Node.js** 18+ ([Download](https://nodejs.org))
- **Python** 3.10+ ([Download](https://python.org))
- **Git** ([Download](https://git-scm.com))
- **PostgreSQL** 13+ ([Download](https://postgresql.org)) OR use Neon (serverless)

### Required API Keys (Free Tier Available)
1. **Groq API Key**
   - Go to [console.groq.com](https://console.groq.com)
   - Sign up with Google/email
   - Create API key in dashboard
   - Copy key (you'll use it in .env)

2. **Hindsight API Key**
   - Visit [hindsight.is](https://hindsight.is)
   - Sign up or login
   - Generate API key from dashboard
   - Copy key (you'll use it in .env)

3. **PostgreSQL Database**
   - Option A: Local PostgreSQL
     ```bash
     # macOS
     brew install postgresql@15
     brew services start postgresql@15
     
     # Windows - Use installer from postgresql.org
     # Linux - apt-get install postgresql postgresql-contrib
     ```
   
   - Option B: Neon (Recommended for quick setup)
     - Go to [neon.tech](https://neon.tech)
     - Sign up with GitHub
     - Create a project
     - Copy connection string from dashboard

---

## Installation Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/NeuroCareer-AI.git
cd NeuroCareer-AI
```

### Step 2: Backend Setup

#### 2a. Create Virtual Environment

```bash
cd backend

# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

After activation, you should see `(venv)` in your terminal.

#### 2b. Install Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- fastapi - Web framework
- pydantic-ai - AI agent framework
- sqlalchemy - Database ORM
- pyjwt - Authentication
- python-multipart - File uploads
- httpx - HTTP client
- psycopg2-binary - PostgreSQL driver
- groq - Groq SDK

#### 2c. Create Backend .env File

In `backend/.env`, add:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================

# PostgreSQL Connection String
# Format: postgresql://username:password@host:port/database
DATABASE_URL=postgresql://postgres:password@localhost:5432/neurocareer

# For Neon (serverless):
# DATABASE_URL=postgresql://user:password@ep-xxxxx.region.neon.tech/neurocareer?sslmode=require

# ============================================
# AUTHENTICATION
# ============================================

# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-super-secret-key-change-this

JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 hours

# ============================================
# GROQ LLM CONFIGURATION
# ============================================

# Get from: https://console.groq.com
GROQ_API_KEY=gsk_your_key_here

# Model to use (do not change)
GROQ_MODEL=qwen/qwen3-32b

# Groq API endpoint (do not change)
GROQ_BASE_URL=https://api.groq.com/openai/v1

# Timeout for LLM requests in seconds
GROQ_TIMEOUT_SECONDS=30

# ============================================
# HINDSIGHT MEMORY CONFIGURATION
# ============================================

# Get from: https://hindsight.is
HINDSIGHT_API_KEY=your_hindsight_key_here

# Hindsight API endpoint
HINDSIGHT_BASE_URL=https://api.hindsight.is

# ============================================
# FRONTEND URL (for CORS)
# ============================================

FRONTEND_URL=http://localhost:3000

# ============================================
# ENVIRONMENT
# ============================================

ENVIRONMENT=development
DEBUG=false
LOG_LEVEL=INFO
```

**Important Notes:**
- Generate SECRET_KEY: Run `python -c "import secrets; print(secrets.token_hex(32))"`
- Keep all keys confidential, never commit .env to git
- Update DATABASE_URL for your setup
- Adjust GROQ_TIMEOUT_SECONDS if you have slow internet

### Step 3: Database Setup

#### 3a. Create Database

If using local PostgreSQL:

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql prompt, create database:
CREATE DATABASE neurocareer;
CREATE USER neurocareer_user WITH PASSWORD 'secure_password';
ALTER ROLE neurocareer_user SET client_encoding TO 'utf8';
ALTER ROLE neurocareer_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE neurocareer_user SET default_transaction_deferrable TO on;
ALTER ROLE neurocareer_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE neurocareer TO neurocareer_user;
\q
```

Then update DATABASE_URL in .env:
```env
DATABASE_URL=postgresql://neurocareer_user:secure_password@localhost:5432/neurocareer
```

#### 3b. Run Migrations

```bash
# From backend directory
alembic upgrade head
```

If you don't have Alembic setup, the tables will be created automatically on first run via SQLAlchemy.

### Step 4: Frontend Setup

#### 4a. Navigate to Frontend

```bash
cd ../frontend
```

#### 4b. Install Dependencies

```bash
npm install
```

This installs:
- next - React framework
- react - UI library
- tailwindcss - CSS framework
- framer-motion - Animations
- lucide-react - Icons
- typescript - Type safety

#### 4c. Create Frontend .env.local

In `frontend/.env.local`, add:

```env
# API Base URL - points to backend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=
```

**Important:**
- NEXT_PUBLIC_* variables are exposed to the browser (don't put secrets here)
- Keep NEXT_PUBLIC_API_BASE_URL pointing to backend server

---

## Verification

### 1. Verify Python Installation

```bash
python --version  # Should show 3.10+
pip --version     # Should show pip for Python 3.10+
```

### 2. Verify Node Installation

```bash
node --version    # Should show 18+
npm --version     # Should show 8+
```

### 3. Verify Database Connection

```bash
# From backend directory
python -c "from sqlalchemy import create_engine; engine = create_engine('$DATABASE_URL'); print('✓ Database connected')"
```

### 4. Verify Virtual Environment Activation

```bash
# Should show (venv) prefix in your terminal
# And this should show the venv python:
which python  # macOS/Linux
where python  # Windows
```

---

## Running the Application

### Terminal 1: Start Backend

```bash
cd backend

# Activate virtual environment (if not active)
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

# Start FastAPI server
python -m uvicorn app.main:app --reload --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

Visit http://localhost:8000/docs to see API documentation.

### Terminal 2: Start Frontend

```bash
cd frontend

# Start Next.js development server
npm run dev
```

**Expected output:**
```
> next dev
  ▲ Next.js 14.x
  - ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

Visit http://localhost:3000 to see the application.

### Terminal 3: Monitor (Optional)

Keep a third terminal open to check logs:
```bash
# Backend logs appear in Terminal 1
# Frontend logs appear in Terminal 2
# Browser console logs available via F12
```

---

## First Time Usage

1. **Open http://localhost:3000**
2. **Sign Up**
   - Enter email (e.g., test@example.com)
   - Enter password (remember it)
   - Click "Sign Up"

3. **Upload Resume**
   - Click "Upload Resume" card
   - Select a PDF file from your computer
   - Wait 1-2 seconds for processing

4. **Check Skill Map**
   - Click "Expand Skill Map" button
   - See extracted skills with levels
   - Check job readiness percentage

5. **Try Career Chat**
   - Click Brain icon (Career Chat) in sidebar
   - Type: "What skills should I focus on?"
   - Get AI response based on your resume

6. **Try Mock Interview**
   - Click Mic icon (Mock Interview) in sidebar
   - Mention a project you've worked on
   - Answer interview questions

---

## Troubleshooting

### "Module not found" Error

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### "PostgreSQL connection refused"

```bash
# Check if PostgreSQL is running
# macOS: brew services list | grep postgresql
# Windows: Services > PostgreSQL > check status

# If not running, start it:
# macOS: brew services start postgresql@15
# Windows: Services > PostgreSQL > Start
```

### "Port 8000 already in use"

```bash
# Use different port
python -m uvicorn app.main:app --reload --port 8001

# Then update frontend .env.local:
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
```

### "Port 3000 already in use"

```bash
# Use different port
npm run dev -- -p 3001
```

### "Database URL invalid"

- Check DATABASE_URL format: `postgresql://user:password@host:port/database`
- Verify database name exists
- Verify user has permissions
- For Neon, add `?sslmode=require` to URL

### "GROQ_API_KEY not found"

```bash
# Make sure .env file is in backend directory
# Verify key is set: echo $GROQ_API_KEY (macOS/Linux)
# Or: echo %GROQ_API_KEY% (Windows)

# If not set, create .env file and restart backend
```

### "Hindsight API error"

- Verify HINDSIGHT_API_KEY is correct
- Check API key hasn't expired
- Verify HINDSIGHT_BASE_URL is correct

---

## Environment Configuration Reference

### Backend .env Variables

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection | `postgresql://user:pass@localhost/db` |
| SECRET_KEY | JWT signing key | `abc123...` |
| GROQ_API_KEY | Groq API key | `gsk_...` |
| GROQ_MODEL | LLM model | `qwen/qwen3-32b` |
| GROQ_TIMEOUT_SECONDS | LLM timeout | `30` |
| HINDSIGHT_API_KEY | Hindsight API key | `hst_...` |
| FRONTEND_URL | Frontend URL for CORS | `http://localhost:3000` |
| ENVIRONMENT | dev/prod | `development` |

### Frontend .env.local Variables

| Variable | Description | Example |
|----------|-------------|---------|
| NEXT_PUBLIC_API_BASE_URL | Backend API URL | `http://localhost:8000` |

---

## Production Deployment

### Before Deploying

1. **Change SECRET_KEY**
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

2. **Use production database**
   - Update DATABASE_URL to production database
   - Run migrations: `alembic upgrade head`

3. **Enable HTTPS**
   - Use HTTPS in FRONTEND_URL
   - Configure SSL certificates

4. **Update environment variables**
   - Set ENVIRONMENT=production
   - Set DEBUG=false
   - Update FRONTEND_URL for your domain

### Deployment Platforms

**Backend (FastAPI):**
- Railway.app
- Heroku
- Render
- AWS Lambda
- Google Cloud Run
- Azure App Service

**Frontend (Next.js):**
- Vercel (recommended)
- Netlify
- AWS Amplify
- Railway.app

### Example: Railway Deployment

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create project
railway init

# Deploy
railway up
```

---

## Maintenance

### Updating Dependencies

```bash
# Backend
pip install -r requirements.txt --upgrade

# Frontend
npm update
```

### Checking Service Health

```bash
# Backend health
curl http://localhost:8000/health

# Frontend
http://localhost:3000
```

### Viewing Logs

```bash
# Backend logs - visible in terminal running uvicorn
# Frontend logs - visible in browser console (F12)

# To increase log verbosity:
# In backend .env: LOG_LEVEL=DEBUG
```

---

## Getting Help

### Debug Information to Collect

Before asking for help, gather:
1. Error message from terminal/console
2. Backend logs (show full error)
3. Frontend browser console (F12)
4. Python version: `python --version`
5. Node version: `node --version`
6. Database status: Can you connect?

### Common Fixes

1. **Restart everything**
   - Stop backend (Ctrl+C)
   - Stop frontend (Ctrl+C)
   - Restart in new terminals

2. **Clear caches**
   ```bash
   # Backend
   rm -rf __pycache__ .pytest_cache

   # Frontend
   rm -rf .next node_modules package-lock.json
   npm install
   ```

3. **Fresh database**
   ```bash
   # Warning: This deletes all data!
   dropdb neurocareer
   createdb neurocareer
   alembic upgrade head
   ```

---

## Next Steps

After setup is complete:

1. ✅ **Verify** - Check all services running
2. ✅ **Test** - Create account and upload resume
3. ✅ **Explore** - Try all features
4. ✅ **Deploy** - Follow deployment guide for production

Happy coding! 🚀
