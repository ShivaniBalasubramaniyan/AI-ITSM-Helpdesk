"""
AI-ITSM Helpdesk Automation Platform API
Enterprise-grade FastAPI application powering ticket management, AI classification,
RAG-powered conversational helpdesk assistant, SLA tracking, and ServiceNow integration.
"""

import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.abspath(os.path.join(backend_dir, ".."))
for p in [backend_dir, project_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

try:
    from backend.database import (
        init_db,
        get_all_tickets,
        get_ticket_by_id,
        create_ticket as db_create_ticket,
        update_ticket as db_update_ticket,
        delete_ticket as db_delete_ticket,
        get_ticket_history,
        get_dashboard_statistics,
        record_kb_feedback
    )
    from backend.models import (
        TicketCreate,
        TicketUpdate,
        TicketResponse,
        TicketHistoryItem,
        TicketStatusTransition,
        AIClassifyRequest,
        AIClassifyResponse,
        AIAssistantRequest,
        AIAssistantResponse,
        KBArticleSummary,
        KBArticleDetail,
        KBFeedbackRequest,
        DashboardStatsResponse
    )
    from backend.kb_service import kb_service
    from backend.ai_engine import ai_engine
    from backend.servicenow_router import router as servicenow_router
except (ImportError, ValueError):
    from database import (
        init_db,
        get_all_tickets,
        get_ticket_by_id,
        create_ticket as db_create_ticket,
        update_ticket as db_update_ticket,
        delete_ticket as db_delete_ticket,
        get_ticket_history,
        get_dashboard_statistics,
        record_kb_feedback
    )  # type: ignore
    from models import (
        TicketCreate,
        TicketUpdate,
        TicketResponse,
        TicketHistoryItem,
        TicketStatusTransition,
        AIClassifyRequest,
        AIClassifyResponse,
        AIAssistantRequest,
        AIAssistantResponse,
        KBArticleSummary,
        KBArticleDetail,
        KBFeedbackRequest,
        DashboardStatsResponse
    )  # type: ignore
    from kb_service import kb_service  # type: ignore
    from ai_engine import ai_engine  # type: ignore
    from servicenow_router import router as servicenow_router  # type: ignore

# Initialize database schema and initial seed data on startup
init_db()

app = FastAPI(
    title="AI-ITSM Helpdesk Automation Platform API",
    description="Intelligent IT Service Management (ITSM) API with automated classification, SLA monitoring, and ServiceNow synchronization.",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount ServiceNow Router
app.include_router(servicenow_router)

# -------------------------------------------------------------
# Health Check Endpoint (Preserved existing functionality)
# -------------------------------------------------------------
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": "AI-ITSM",
        "version": "1.0.0",
        "modules": {
            "database": "sqlite_ready",
            "knowledge_base": "indexed",
            "ai_classifier": "active",
            "servicenow_sync": "connected"
        }
    }

# -------------------------------------------------------------
# Dashboard Statistics
# -------------------------------------------------------------
@app.get("/api/dashboard/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats():
    stats = get_dashboard_statistics()
    return stats

# -------------------------------------------------------------
# Ticket Management Endpoints
# -------------------------------------------------------------
@app.get("/api/tickets", response_model=List[TicketResponse])
def list_tickets(
    search: Optional[str] = Query(default=None, description="Search term for title, description or requester"),
    status: Optional[str] = Query(default=None, description="Filter by status (New, Open, In Progress, Resolved, Closed)"),
    priority: Optional[str] = Query(default=None, description="Filter by priority (Critical, High, Medium, Low)"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0)
):
    tickets = get_all_tickets(
        search=search,
        status=status,
        priority=priority,
        category=category,
        limit=limit,
        offset=offset
    )
    return tickets

@app.post("/api/tickets", response_model=TicketResponse, status_code=201)
def create_ticket(payload: TicketCreate):
    data = payload.model_dump()
    
    # If AI classification not provided by user, run auto-classifier
    if not data.get("ai_classification"):
        ai_res = ai_engine.classify_ticket(
            title=data.get("title", ""),
            description=data.get("description", "")
        )
        data["ai_classification"] = ai_res
        if not payload.category or payload.category == "Software":
            data["category"] = ai_res["category"]
        if not payload.priority or payload.priority == "Medium":
            data["priority"] = ai_res["priority"]
            data["urgency"] = ai_res["urgency"]
            data["impact"] = ai_res["impact"]
        if not payload.assigned_team or payload.assigned_team == "IT Service Desk":
            data["assigned_team"] = ai_res["suggested_team"]

    created = db_create_ticket(data)
    return created

@app.get("/api/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: str = Path(..., examples=["INC-1001"])):
    ticket = get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    return ticket

@app.put("/api/tickets/{ticket_id}", response_model=TicketResponse)
def update_ticket(ticket_id: str, payload: TicketUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    actor = updates.pop("actor", "IT Staff")
    updated = db_update_ticket(ticket_id, updates, actor=actor)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    return updated

@app.delete("/api/tickets/{ticket_id}")
def delete_ticket(ticket_id: str):
    success = db_delete_ticket(ticket_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    return {"status": "success", "message": f"Ticket {ticket_id} successfully deleted"}

@app.get("/api/tickets/{ticket_id}/history", response_model=List[TicketHistoryItem])
def get_history(ticket_id: str):
    ticket = get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    history = get_ticket_history(ticket_id)
    return history

@app.post("/api/tickets/{ticket_id}/transition", response_model=TicketResponse)
def transition_ticket_status(ticket_id: str, payload: TicketStatusTransition):
    valid_statuses = ["New", "Open", "In Progress", "Resolved", "Closed"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    updates = {
        "status": payload.status,
        "resolution_notes": payload.resolution_notes or ""
    }
    updated = db_update_ticket(ticket_id, updates, actor=payload.actor)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    return updated

# -------------------------------------------------------------
# AI Classification & Helpdesk Assistant
# -------------------------------------------------------------
@app.post("/api/ai/classify", response_model=AIClassifyResponse)
def classify_ticket_endpoint(payload: AIClassifyRequest):
    result = ai_engine.classify_ticket(
        title=payload.title,
        description=payload.description
    )
    return result

@app.post("/api/ai/assistant", response_model=AIAssistantResponse)
def ai_assistant_endpoint(payload: AIAssistantRequest):
    history_dicts = [h.model_dump() for h in payload.history] if payload.history else []
    result = ai_engine.generate_assistant_response(
        user_message=payload.message,
        history=history_dicts
    )
    return result

# -------------------------------------------------------------
# Knowledge Base Endpoints
# -------------------------------------------------------------
@app.get("/api/knowledge", response_model=List[KBArticleSummary])
def list_knowledge_articles(
    category: Optional[str] = Query(default=None, description="Filter articles by category"),
    search: Optional[str] = Query(default=None, description="Search term across articles")
):
    articles = kb_service.list_articles(category=category, search=search)
    return articles

@app.get("/api/knowledge/{article_id}", response_model=KBArticleDetail)
def get_knowledge_article(article_id: str):
    article = kb_service.get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail=f"Knowledge base article {article_id} not found")
    return article

@app.post("/api/knowledge/{article_id}/feedback")
def submit_kb_feedback(article_id: str, payload: KBFeedbackRequest):
    article = kb_service.get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail=f"Knowledge base article {article_id} not found")
    record_kb_feedback(article["id"], payload.helpful)
    return {"status": "success", "message": "Feedback recorded"}

# -------------------------------------------------------------
# Static Frontend Serving (Optional unified hosting)
# -------------------------------------------------------------
frontend_dist = os.path.abspath(os.path.join(project_dir, "frontend", "dist"))
frontend_assets = os.path.join(frontend_dist, "assets")

if os.path.exists(frontend_assets):
    app.mount("/assets", StaticFiles(directory=frontend_assets), name="assets")

@app.get("/")
def serve_root():
    index_file = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "status": "healthy",
        "message": "AI-ITSM Helpdesk API is running. Visit /docs for OpenAPI documentation or start the Vite frontend on port 3000."
    }

# -------------------------------------------------------------
# Local Dev Server Runner
# -------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
