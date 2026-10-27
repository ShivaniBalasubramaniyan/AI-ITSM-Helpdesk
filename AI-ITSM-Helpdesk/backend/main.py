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

import csv
import io
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
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
        record_kb_feedback,
        get_db_status,
        sync_sqlite_to_mongodb,
        add_ticket_comment,
        get_ticket_comments
    )
    from backend.models import (
        TicketCreate,
        TicketUpdate,
        TicketResponse,
        TicketHistoryItem,
        TicketStatusTransition,
        BulkTicketActionRequest,
        BulkTicketActionResponse,
        AIClassifyRequest,
        AIClassifyResponse,
        AIAssistantRequest,
        AIAssistantResponse,
        KBArticleSummary,
        KBArticleDetail,
        KBFeedbackRequest,
        KBArticleCreate,
        DashboardStatsResponse,
        AIDiagnosisResponse,
        AIResolveRequest,
        TicketCommentCreate,
        TicketCommentResponse
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
        record_kb_feedback,
        get_db_status,
        sync_sqlite_to_mongodb,
        add_ticket_comment,
        get_ticket_comments
    )  # type: ignore
    from models import (
        TicketCreate,
        TicketUpdate,
        TicketResponse,
        TicketHistoryItem,
        TicketStatusTransition,
        BulkTicketActionRequest,
        BulkTicketActionResponse,
        AIClassifyRequest,
        AIClassifyResponse,
        AIAssistantRequest,
        AIAssistantResponse,
        KBArticleSummary,
        KBArticleDetail,
        KBFeedbackRequest,
        KBArticleCreate,
        DashboardStatsResponse,
        AIDiagnosisResponse,
        AIResolveRequest,
        TicketCommentCreate,
        TicketCommentResponse
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
# Health Check Endpoint
# -------------------------------------------------------------
@app.get("/api/health")
def health_check():
    db_info = get_db_status()
    return {
        "status": "healthy",
        "application": "AI-ITSM",
        "version": "1.0.0",
        "database": db_info,
        "modules": {
            "database": f"{db_info.get('type', 'sqlite')}_connected",
            "knowledge_base": "indexed",
            "ai_classifier": "active",
            "servicenow_sync": "connected"
        }
    }

@app.get("/api/database/status")
def database_status():
    return get_db_status()

@app.post("/api/database/sync-to-mongodb")
def sync_to_mongodb():
    return sync_sqlite_to_mongodb()

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

@app.get("/api/tickets/{ticket_id}/comments", response_model=List[TicketCommentResponse])
def get_comments(ticket_id: str):
    ticket = get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    comments = get_ticket_comments(ticket_id)
    return comments

@app.post("/api/tickets/{ticket_id}/comments", response_model=TicketCommentResponse, status_code=201)
def add_comment(ticket_id: str, payload: TicketCommentCreate):
    ticket = get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    comment = add_ticket_comment(ticket_id, payload.model_dump())
    return comment

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

@app.get("/api/tickets/{ticket_id}/ai-diagnosis", response_model=AIDiagnosisResponse)
def get_ticket_ai_diagnosis(ticket_id: str):
    ticket = get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    diagnosis = ai_engine.diagnose_and_resolve_ticket(ticket)
    return diagnosis

@app.post("/api/tickets/{ticket_id}/ai-resolve", response_model=TicketResponse)
def auto_resolve_ticket_with_ai(ticket_id: str, payload: AIResolveRequest):
    ticket = get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    res_notes = payload.resolution_notes
    if not res_notes:
        diagnosis = ai_engine.diagnose_and_resolve_ticket(ticket)
        res_notes = diagnosis.get("suggested_resolution_notes", "Auto-resolved via AI diagnosis.")

    actor = payload.actor or "AI Autonomous Resolver (Copilot)"
    now_iso = datetime.now(timezone.utc).isoformat()
    updates = {
        "status": "Resolved",
        "resolved_at": now_iso,
        "resolution_notes": res_notes
    }
    updated = db_update_ticket(ticket_id, updates, actor=actor)
    if not updated:
        raise HTTPException(status_code=500, detail=f"Failed to auto-resolve ticket {ticket_id}")
    return updated

@app.post("/api/tickets/bulk", response_model=BulkTicketActionResponse)
def bulk_ticket_action(payload: BulkTicketActionRequest):
    action = payload.action.lower()
    affected_ids = []
    actor = payload.actor or "IT Staff"

    if action == "delete":
        for tid in payload.ticket_ids:
            if db_delete_ticket(tid):
                affected_ids.append(tid)
        return BulkTicketActionResponse(
            status="success",
            action="delete",
            affected_count=len(affected_ids),
            affected_ids=affected_ids,
            message=f"Successfully deleted {len(affected_ids)} tickets"
        )

    updates = {}
    if action == "status" and payload.status:
        updates["status"] = payload.status
        if payload.resolution_notes:
            updates["resolution_notes"] = payload.resolution_notes
    elif action == "priority" and payload.priority:
        updates["priority"] = payload.priority
    elif action == "reassign":
        if payload.assigned_team:
            updates["assigned_team"] = payload.assigned_team
        if payload.assigned_agent:
            updates["assigned_agent"] = payload.assigned_agent

    if not updates:
        raise HTTPException(status_code=400, detail="No valid update fields provided for bulk action")

    for tid in payload.ticket_ids:
        updated = db_update_ticket(tid, updates, actor=actor)
        if updated:
            affected_ids.append(tid)

    return BulkTicketActionResponse(
        status="success",
        action=action,
        affected_count=len(affected_ids),
        affected_ids=affected_ids,
        message=f"Successfully updated {len(affected_ids)} tickets with action '{action}'"
    )

@app.get("/api/tickets/export/csv")
def export_tickets_csv(
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None)
):
    tickets = get_all_tickets(search=search, status=status, priority=priority, category=category, limit=1000)
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Ticket ID", "Title", "Requester", "Department", "Category",
        "Priority", "Status", "Assigned Team", "Assigned Agent",
        "SLA Target (Hours)", "SLA Due At", "SLA Status",
        "Created At", "Resolved At", "ServiceNow Number", "Description"
    ])
    
    for t in tickets:
        writer.writerow([
            t.get("id"),
            t.get("title"),
            t.get("requester"),
            t.get("department"),
            t.get("category"),
            t.get("priority"),
            t.get("status"),
            t.get("assigned_team"),
            t.get("assigned_agent"),
            t.get("sla_target_hours"),
            t.get("sla_due_at"),
            t.get("sla_status"),
            t.get("created_at"),
            t.get("resolved_at") or "",
            t.get("servicenow_number") or "",
            (t.get("description") or "").replace("\n", " ")
        ])
    
    output.seek(0)
    filename = f"itsm_tickets_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

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

@app.post("/api/knowledge", response_model=KBArticleDetail, status_code=201)
def create_knowledge_article(payload: KBArticleCreate):
    """Author and publish a new standard operating procedure (SOP) runbook."""
    article = kb_service.create_article(
        title=payload.title,
        category=payload.category,
        content=payload.content,
        tags=payload.tags,
        summary=payload.summary,
        author=payload.author
    )
    return article

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
