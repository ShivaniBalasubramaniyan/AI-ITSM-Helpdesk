# AI-Powered ITSM & Intelligent Helpdesk Automation Platform

An enterprise-grade, hackathon-ready ITSM platform featuring automated incident classification, real-time SLA tracking, RAG-powered IT conversational assistant, approved knowledge base runbooks, and bi-directional ServiceNow Table API synchronization.

---

## Key Highlights

- **Executive ITSM Dashboard**: Real-time KPI statistics (Total, Open, In Progress, Resolved, Critical/High), dynamic SLA compliance rates, SLA health progress bars (Healthy, At Risk, Breached, Met), category distribution charts, and recent incident logs.
- **Incident Lifecycle Management**: Full CRUD operations, multi-field search (title, description, requester, ID), live filtering by status, priority, and category, and chronological audit timelines.
- **AI Classification & Routing Engine**: Automatically classifies incident category, urgency, priority, and assignment team with high accuracy. Generates user-friendly reasoning and recommended remediation steps. Works 100% locally with zero external API key requirements.
- **Conversational AI Helpdesk Agent**: Chatbot leveraging Retrieval-Augmented Generation (RAG) over approved IT knowledge base articles. Provides structured troubleshooting steps, cites reference runbooks, and offers 1-click automatic ticket escalation with pre-populated fields.
- **Enterprise IT Knowledge Base**: Markdown-backed operational guides (`KB001` - `KB008`), instant tag/keyword search, category filters, and interactive helpfulness feedback voting.
- **Automated Workflow & SLA Engine**: State transition workflow (`New` -> `Open` -> `In Progress` -> `Resolved` -> `Closed`) with resolution notes and live SLA countdowns based on incident severity.
- **Mock ServiceNow Table API Integration**: Simulates ServiceNow incident records (`/api/now/table/incident`), with one-click single ticket sync and batch sync of all unlinked incidents.

---

## System Architecture & URLs

- **Frontend (Vite Dev)**: `http://localhost:3000`
- **Backend API (FastAPI)**: `http://127.0.0.1:8000`
- **FastAPI Interactive Docs (Swagger)**: `http://127.0.0.1:8000/docs`
- **API Health Check**: `http://127.0.0.1:8000/api/health`
- **Unified Hosted App (FastAPI serving built frontend)**: `http://127.0.0.1:8000/`

---

## Quick Start on Windows

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Backend Setup & Run

Open a PowerShell terminal in `AI-ITSM-Helpdesk\backend`:
```powershell
# Optional: create & activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server (Port 8000)
python main.py
```
*The backend automatically initializes `itsm.db` and seeds sample IT incidents on first startup.*

### 3. Frontend Setup & Run

Open a second PowerShell terminal in `AI-ITSM-Helpdesk\frontend`:
```powershell
# Run the Vite development server (Port 3000)
node ./node_modules/vite/bin/vite.js --port 3000 --host
# OR via npm.cmd
npm.cmd run dev
```

### 4. Running Automated Tests

Open a PowerShell terminal in `AI-ITSM-Helpdesk`:
```powershell
python -m unittest tests/test_api.py
```

---

## Environment Variables (Optional)

The application works completely offline with zero required configuration. To optionally connect cloud LLM providers:

```bash
# Optional OpenAI / Gemini API Keys for LLM classification enrichment
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Optional API URL override for frontend (defaults to proxy /api)
VITE_API_URL=http://127.0.0.1:8000
```

---

## Hackathon Demo Walkthrough (What to Demonstrate)

1. **Executive Dashboard**:
   - Open `http://localhost:3000` (or `http://127.0.0.1:8000`).
   - Showcase the KPI cards (Total Incidents, Active, Resolved, Critical/High, and SLA Compliance rate).
   - Point out the dynamic SLA breakdown bar (Healthy vs At Risk vs Breached vs Met) and the category distribution chart.

2. **AI-Powered Incident Creation**:
   - Click the **"+ Create Ticket"** button in the header.
   - Enter a title: `Cisco AnyConnect VPN certificate handshake failed on corporate laptop`
   - Click **"✨ Run AI Auto-Classify"**.
   - Show how the AI automatically predicts **Category: Network**, **Priority: High (4h SLA)**, **Team: Network Operations**, and displays a transparent explanation of its reasoning.
   - Click **"Submit Incident"** and observe the live creation and notification.

3. **Interactive Ticket Details & Workflow**:
   - Click on the newly created ticket or any ticket in the table.
   - Show the dynamic SLA remaining countdown timer.
   - Show the transparent AI recommendation box and suggested IT actions.
   - Advance the ticket through the workflow: click **"▶ Start Working"** (status changes to In Progress), then click **"✔ Mark Resolved"** and enter resolution notes.
   - View the chronological **Audit History Timeline** updating in real time.

4. **ServiceNow Bi-Directional Synchronization**:
   - In the Ticket Detail modal, click **"🔄 Sync to ServiceNow"**.
   - Observe the ServiceNow Incident Number generated (e.g. `INC0010006`).
   - Switch to the **ServiceNow Hub** tab in the top navigation.
   - Click **"🔄 Batch Sync All Unlinked Incidents"** to demonstrate bulk synchronization.

5. **Conversational AI Helpdesk Assistant**:
   - Navigate to the **"AI Helpdesk Assistant"** tab.
   - Click one of the quick prompt pills: `My Cisco AnyConnect VPN fails to authenticate`.
   - Watch the AI Assistant perform RAG over the approved knowledge base, return step-by-step troubleshooting instructions, cite `KB001`, and provide a **"🎫 Create Ticket Automatically"** button for 1-click escalation.

6. **Enterprise Knowledge Base**:
   - Navigate to the **"Knowledge Base"** tab.
   - Filter by categories (`Network`, `Access & Identity`, `Software`, `Hardware`, `Email`).
   - Open an article (e.g. `KB002 - Corporate Password Reset and Okta MFA`).
   - Click **"👍 Helpful"** to show instant community feedback counter updates.

7. **FastAPI OpenAPI Swagger Documentation**:
   - Open `http://127.0.0.1:8000/docs` to demonstrate the clean, validated REST API endpoints.
