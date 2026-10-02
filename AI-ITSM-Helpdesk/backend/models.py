"""
Pydantic Schemas for AI-ITSM Helpdesk Automation Platform
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class TicketBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200, examples=["Cannot connect to Cisco AnyConnect VPN"])
    description: str = Field(..., min_length=5, examples=["Gateway timed out after 30 seconds."])
    requester: str = Field(default="Employee", examples=["John Doe"])
    department: str = Field(default="Engineering", examples=["Engineering"])
    category: str = Field(default="Software", examples=["Network"])
    priority: str = Field(default="Medium", examples=["High"])
    urgency: str = Field(default="Medium", examples=["High"])
    impact: str = Field(default="Medium", examples=["Medium"])
    assigned_agent: Optional[str] = Field(default="Unassigned")
    assigned_team: Optional[str] = Field(default="IT Service Desk")

class TicketCreate(TicketBase):
    ai_classification: Optional[Dict[str, Any]] = None
    servicenow_sys_id: Optional[str] = None
    servicenow_number: Optional[str] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requester: Optional[str] = None
    department: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    urgency: Optional[str] = None
    impact: Optional[str] = None
    status: Optional[str] = None
    assigned_agent: Optional[str] = None
    assigned_team: Optional[str] = None
    resolution_notes: Optional[str] = None
    servicenow_sys_id: Optional[str] = None
    servicenow_number: Optional[str] = None
    actor: Optional[str] = Field(default="IT Staff")

class TicketStatusTransition(BaseModel):
    status: str = Field(..., examples=["In Progress"])
    actor: str = Field(default="IT Staff", examples=["Elena Rostova"])
    resolution_notes: Optional[str] = Field(default="", examples=["Issue diagnosed and patch applied."])

class TicketResponse(TicketBase):
    id: str
    status: str
    created_at: str
    updated_at: str
    resolved_at: Optional[str] = None
    sla_target_hours: float
    sla_due_at: str
    sla_status: str
    sla_remaining_seconds: Optional[int] = 0
    sla_remaining_hours: Optional[float] = 0.0
    ai_classification: Optional[Dict[str, Any]] = None
    servicenow_sys_id: Optional[str] = None
    servicenow_number: Optional[str] = None
    resolution_notes: Optional[str] = None

class TicketHistoryItem(BaseModel):
    id: int
    ticket_id: str
    timestamp: str
    action: str
    actor: str
    details: Optional[str] = ""

class AIClassifyRequest(BaseModel):
    title: str = Field(..., examples=["VPN gateway disconnected and certificate invalid"])
    description: str = Field(..., examples=["Trying to connect to corporate network from home, get TLS handshake error."])

class AIClassifyResponse(BaseModel):
    category: str
    priority: str
    urgency: str
    impact: str
    suggested_team: str
    confidence: float
    reasoning: str
    suggested_actions: List[str]
    suggested_kb_articles: List[Dict[str, str]]

class AIAssistantMessage(BaseModel):
    role: str = Field(..., examples=["user"])
    content: str = Field(..., examples=["How do I reset my password?"])

class AIAssistantRequest(BaseModel):
    message: str = Field(..., min_length=2, examples=["My Cisco AnyConnect VPN won't connect"])
    history: Optional[List[AIAssistantMessage]] = []

class AIAssistantResponse(BaseModel):
    reply: str
    confidence: float
    suggested_kb_articles: List[Dict[str, Any]]
    troubleshooting_steps: List[str]
    can_auto_resolve: bool
    suggested_ticket: Optional[Dict[str, Any]] = None

class KBArticleSummary(BaseModel):
    id: str
    title: str
    category: str
    tags: List[str]
    created: str
    updated: str
    helpful_count: int = 0
    not_helpful_count: int = 0
    summary: str

class KBArticleDetail(KBArticleSummary):
    content: str
    related_articles: List[Dict[str, str]]

class KBFeedbackRequest(BaseModel):
    helpful: bool = Field(..., examples=[True])

class ServiceNowSyncRequest(BaseModel):
    ticket_id: str

class DashboardStatsResponse(BaseModel):
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    closed_tickets: int
    critical_tickets: int
    high_priority_tickets: int
    critical_and_high: int
    sla_compliance_rate: float
    sla_breakdown: Dict[str, int]
    category_distribution: Dict[str, int]
    priority_distribution: Dict[str, int]
