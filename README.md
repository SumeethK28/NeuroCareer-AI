# NeuroCareer AI - AI-Powered Career Advisor with Persistent Memory

> An intelligent career mentoring platform combining Groq LLM, Hindsight persistent memory, and PydanticAI to provide deeply personalized guidance based on your complete career journey.

## 🎯 What is NeuroCareer AI?

**NeuroCareer AI** is a full-stack application that transforms how you approach career development. Unlike generic AI assistants that forget conversations, NeuroCareer **remembers everything** about your professional journey—your skills, projects, applications, and progress—to provide genuinely personalized guidance.

### The Problem It Solves
- ❌ Generic career advice that doesn't know your actual experience
- ❌ Resume feedback that doesn't reference your real projects
- ❌ Interview practice that asks generic questions
- ❌ No memory of past rejections or skill gaps
- ❌ Tedious manual tracking of applications

### The Solution
- ✅ Context-aware responses referencing your actual skills
- ✅ Personalized resume feedback based on your experience
- ✅ Mock interviews that reference your real projects
- ✅ Smart tracking that detects ghosting and suggests next steps
- ✅ Progressive skill development recommendations

---

## ✨ Core Features

### 1. **Career Chat (AI Advisor)** 💬
Get personalized guidance that evolves with your experience.

- **Context-aware responses** referencing your actual skills and projects
- **Resume feedback** based on your real experience, not generic templates
- **Skill gap analysis** for your target roles
- **Internship recommendations** matched to your profile
- **Real-time chat** with Groq's fast qwen3-32b LLM

**Example Interaction:**
```
You: "What should I focus on for backend internships?"

NeuroCareer: "Great question! Based on your Python and FastAPI 
experience, I recommend prioritizing:

1. Docker - 72% of backend roles require containerization
2. PostgreSQL optimization - you're already using databases
3. AWS or GCP - cloud platforms are essential

I'd suggest building a project that demonstrates all three: 
a containerized FastAPI app with PostgreSQL on AWS. This would 
immediately make you competitive for internships at Amazon, 
Google, and Stripe."
```

---

### 2. **Mock Interview Practice** 🎤
Realistic interview experience that gets harder based on your answers.

- **Real project references** - "Tell me about the FastAPI REST API you built"
- **Progressive difficulty** - Easy questions → Medium → Hard
- **Specific feedback** - "Good job covering error handling, but how about edge cases?"
- **Performance assessment** - Overall score and areas to improve
- **Follow-up questions** - About your implementation decisions and trade-offs

**Example Interview:**
```
NeuroCareer: "I see you built a FastAPI REST API. Walk me 
through your authentication approach."

You: "I used JWT tokens..."

NeuroCareer: "Good choice. How did you handle token refresh? 
And what about security headers?"
```

---

### 3. **Neural Skill Map** 🗺️
Interactive visualization of your skills and career readiness.

- **Visual skill tree** showing all extracted skills
- **4-level skill system**: Beginner → Intermediate → Advanced → Expert
- **Confidence scoring** based on resume analysis
- **Job readiness gauge** for specific roles
- **Real-time updates** when you upload a new resume

**Skill Level Detection:**
Uses intelligent keyword analysis on your resume:
- 🟩 **Expert** (90%): "Led", "architected", "designed", "deployed"
- 🟨 **Advanced** (75%): Multiple complex projects with the skill
- 🟦 **Intermediate** (60%): "Worked with", "collaborated on"
- 🟥 **Beginner** (40%): "Familiar with", "learning"

---

### 4. **Application Tracker with Smart Analysis** 📊
Intelligent tracking of internship/job applications with AI-powered insights.

- **Ghosting detection** - Automatically detects when you're being ghosted (30+ days no activity)
- **Health indicators** - 🟢Green/🟡Yellow/🔴Red status
- **AI recommendations** - "You now qualify for that rejected role after learning Docker"
- **Requirement matching** - Compares job requirements vs your skills
- **Pattern analysis** - Identifies what's working and what isn't

**Health Status Meanings:**
- 🟢 **Green**: Recently active, interview coming up
- 🟡 **Yellow**: Silent 14-29 days, might be ghosting soon
- 🔴 **Red**: Silent 30+ days, likely ghosted
- ⚫ **Gray**: Rejected or offer received

---

### 5. **Skill Evolution Dashboard** 📈
Watch your career growth tracked automatically.

- **Skill progression** - See how your skills improve over time
- **Weekly reflections** - AI generates career growth suggestions
- **Pattern recognition** - "You're learning quickly in backend, consider frontend too"
- **Achievement tracking** - Quantifiable metrics of your progress
- **Next steps** - Specific recommendations for continued growth

---

### 6. **Smart Resume Analysis** 📄
Extract skills and achievements intelligently from your PDF.

- **Automatic skill extraction** - No manual tagging needed
- **Context-aware levels** - Understands if you "led" vs "assisted"
- **Achievement identification** - Finds quantifiable metrics
- **Gap analysis** - Shows what you're missing for target roles
- **Improvement suggestions** - "Add metrics to these achievements"

---

## 🏗️ Technology Stack

### Backend
```
FastAPI (Python web framework)
├─ PydanticAI (AI agent framework with tools)
├─ Groq API (qwen/qwen3-32b LLM)
├─ Hindsight (persistent memory system)
├─ PostgreSQL (database via Neon)
├─ SQLAlchemy (ORM)
└─ PyJWT (authentication)
```

### Frontend
```
Next.js 14 (React framework)
├─ Tailwind CSS (styling)
├─ Framer Motion (animations)
├─ TypeScript (type safety)
└─ Fetch API (HTTP communication)
```

### Infrastructure
```
Database: PostgreSQL (Neon serverless)
LLM: Groq (OpenAI-compatible API)
Memory: Hindsight (persistent memory service)
Runtime: Node.js (frontend) + Python (backend)
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **Python** 3.10+
- **Groq API Key** (free from [console.groq.com](https://console.groq.com))
- **Hindsight API Key** (from your Hindsight dashboard)
- **PostgreSQL** URL (Neon provides free tier)

### Installation (5 minutes)

#### 1. Clone & Setup
```bash
git clone https://github.com/yourusername/NeuroCareer-AI.git
cd NeuroCareer-AI
```

#### 2. Backend Setup
```bash
cd backend

# Create environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (see section below)
cp .env.example .env
```

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env file (see section below)
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000" > .env.local
```

#### 4. Configure Environment

**Backend `.env`** (backend/.env):
```env
# Database
DATABASE_URL=postgresql://user:password@host:port/neurocareer

# JWT Secret (generate: `openssl rand -hex 32`)
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Groq LLM
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=qwen/qwen3-32b
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_TIMEOUT_SECONDS=30

# Hindsight Memory
HINDSIGHT_API_KEY=your_hindsight_key_here
HINDSIGHT_BASE_URL=https://api.hindsight.is

# Frontend
FRONTEND_URL=http://localhost:3000

# Environment
ENVIRONMENT=development
```

**Frontend `.env.local`** (frontend/.env.local):
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Running the Application

#### Start Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
Visit http://localhost:8000/docs for API documentation.

#### Start Frontend (New Terminal)
```bash
cd frontend
npm run dev
```
Visit http://localhost:3000 to access the application.

#### Verify Setup
1. Navigate to http://localhost:3000
2. Sign up with an email
3. Upload a resume
4. Click "Career Chat" (Brain icon) and start asking questions

---

## 📖 How to Use

### First Time
1. **Sign up** - Create your account
2. **Upload resume** - PDF format, any length
3. **Wait** - Processing takes ~2 seconds
4. **Explore** - Check your Neural Skill Map

### Career Chat
Ask questions like:
- "What skills should I focus on?"
- "How do I improve my resume?"
- "What internships match my profile?"
- "Am I ready for senior roles?"
- "What should I learn next?"

### Mock Interview
1. Mention your target role: "I'm applying for backend internships"
2. Describe a project: "I built a REST API with FastAPI"
3. Answer questions asked by the AI
4. Get feedback on your answers

### Application Tracker
1. Log each application
2. Add required skills
3. Track status (applied, reviewing, interview, offer, rejected)
4. AI automatically analyzes health and ghosting status

### Skill Map
- Click "Expand Skill Map" to see visualization
- Hover over skills to see details
- Check job readiness percentage for your target role

---

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Agent (Career Chat & Mock Interview)
- `POST /api/agent/chat` - Send message to AI agent

### Resume
- `POST /api/resume` - Upload resume
- `GET /api/resume` - Get latest resume analysis

### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `PUT /api/applications/{id}` - Update application
- `GET /api/applications/smart/analysis` - AI analysis

### Skills
- `GET /api/skills/tree` - Get skill tree data
- `GET /api/skills/{skill_id}` - Get skill details

---

## 🔒 Security

### Authentication
- JWT tokens with HS256 encryption
- HttpOnly cookies (XSS protection)
- 24-hour token expiration
- Password hashing with bcrypt

### Data Protection
- User isolation by user_id
- HTTPS recommended for production
- No sensitive data in logs
- Groq API calls encrypted

### Best Practices
- Change `SECRET_KEY` before production
- Use strong database passwords
- Rotate API keys regularly
- Enable HTTPS in production

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not authenticated" | Login again, check browser cookies |
| Resume not uploading | Try different PDF, check file size < 10MB |
| Career Chat not responding | Check GROQ_API_KEY, restart backend |
| Skills not showing | Wait 2+ seconds after resume upload, refresh |
| Rate limiting | Wait 60 seconds, don't exceed 5 requests/min |

**Debug mode:**
Add to backend `.env`:
```env
DEBUG=true
LOG_LEVEL=DEBUG
```

Check logs in terminal and browser console (F12).

---

## 📊 Performance

Expected response times:
- Career Chat: 3-7 seconds
- Mock Interview: 4-8 seconds  
- Resume processing: 1-3 seconds
- Skill map rendering: <500ms

---

## 🏆 Architecture Highlights

### Smart Skill Detection
Uses keyword analysis to determine skill levels:
```
Resume: "Led development of microservices..."
→ Expert level detected (90%)

Resume: "Worked with Python..."
→ Intermediate level detected (60%)
```

### Context Injection
Every AI request includes user's:
- Top skills
- Recent projects
- Application history
- Current goals

### Ghosting Detection
Automatically identifies when:
- No activity for 30+ days → Red (ghosted)
- No activity for 14+ days → Yellow (risky)
- Recent activity → Green (active)

### Progressive Mock Interviews
Adapts difficulty based on answers:
```
User answers well → Next question is harder
User struggles → Provide hint, ask simpler question
```

---

## 📁 Project Structure

```
NeuroCareer-AI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── agents/              # PydanticAI agent logic
│   │   ├── api/routes/          # API endpoints
│   │   ├── services/            # Business logic
│   │   ├── models/              # Database models
│   │   └── schemas/             # Request/response schemas
│   ├── requirements.txt          # Python dependencies
│   └── .env                      # Environment variables
│
├── frontend/
│   ├── app/                      # Next.js app directory
│   ├── components/               # React components
│   ├── lib/                      # Utilities
│   ├── package.json              # Node dependencies
│   └── .env.local                # Environment variables
│
└── README.md                      # This file
```

---

## 🎯 Hackathon Submission

**Event**: Hindsight Hackathon  
**Category**: AI-Powered Career Advisor  
**Technologies**: 
- Groq LLM (qwen/qwen3-32b)
- Hindsight Memory (Retain/Recall/Reflect)
- PydanticAI (Agent framework)
- FastAPI & Next.js (Full-stack)

**Key Innovation**: Uses persistent memory to provide genuinely personalized guidance based on actual career history, not generic templates.

---

## 📞 Support

For issues:
1. Check troubleshooting section above
2. Review backend logs: Terminal running `uvicorn`
3. Review frontend logs: Browser console (F12)
4. Check `.env` configuration

---

## 🙏 Thank You

Built with ❤️ for the Hindsight Hackathon. Good luck with your career journey! 🚀

| **Groq LLM** | Visit [console.groq.com](https://console.groq.com/), create an API key, and enable the OpenAI-compatible endpoint. Set `GROQ_API_KEY`, keep model `qwen/qwen3-32b`, and point `GROQ_BASE_URL=https://api.groq.com/openai/v1`. The backend handles 429s and `ToolCallingError` via the PydanticAI manager. |
| **Hindsight** | Log into [Hindsight Cloud](https://ui.hindsight.vectorize.io), create a bank, and copy the `HINDSIGHT_API_KEY`, `HINDSIGHT_BASE_URL`, and `HINDSIGHT_BANK_ID`. Use promo code `MEMHACK315` in Billing for $50 credits. The backend wraps the `hindsight-client` SDK and exposes `/memory/retain`, `/skills/tree`, `/settings/career-growth/trigger`, and `/memory/clear`. |
| **Postgres** | Provision Railway or Supabase. Update `DATABASE_URL` (asyncpg DSN). Tables: `users`, `application_logs`, `reflection_records`, `user_skills`, `resume_analyses`. |
| **JWT Auth** | Set `JWT_SECRET_KEY` to a strong random string. Use bcrypt for password hashing (built-in). Optional: set `JWT_EXPIRY_HOURS` (default: 24). |

### Feature map

- **Skill Evolution Dashboard** – `GET /api/skills/tree` hydrates a visible Skill Tree (Tailwind + Framer Motion) every time Hindsight retain() runs.
- **Proactive Reflections** – APScheduler triggers the `Career Growth Reflect` job daily + weekly; users can manually trigger via Settings panel.
- **Application Ghosting Analyst** – Logs rejections + JD snippets, runs `recall(view="applications")`, and recommends actions when new skills arrive.
- **Context-aware Mock Interviews** – PydanticAI mock loop always recall()s user projects before generating tougher questions.
- **Resume Intelligence** – PDF upload → PydanticAI resume worker → retained observations back into Hindsight.
- **Compliance** – “Clear Career Memory” button wipes the user’s bank + Postgres traces.

### Deployment pointers

- **Frontend (Vercel)** – Set the env vars from `.env.example`. Point `NEXT_PUBLIC_API_BASE_URL` to the Railway backend. Auth is handled via HttpOnly cookies + JWT.
- **Backend (Railway)** – Add `.env`, run database migrations (if needed), expose port 8000. APScheduler runs inside the single dyno. Enable CORS with `allow_credentials=True`.
- **Secrets hygiene** – `.env` stays local; `.env.example` lists required keys. Both GitHub Actions and local dev should source secrets via vaults/key stores. **Never commit JWT_SECRET_KEY or database credentials.**

### CI / future work

- Add Alembic migrations + seed data for rapid demos.
- Extend the Skill Tree visualization with D3 radial layout and WebSockets for realtime updates.
- Add automated resume parsing queues (Celery) if uploads spike.
- Implement password reset flow via email verification.
