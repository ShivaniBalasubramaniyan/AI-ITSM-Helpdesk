"""
ServiceNow Integration Router
Connects the ITSM platform with the Mock ServiceNow Engine for incident creation and bi-directional status synchronization.
"""

import sys
import os

# Ensure parent directory and mock_servicenow directory are in sys.path
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
mock_dir = os.path.join(parent_dir, "mock_servicenow")
for path_dir in [parent_dir, mock_dir]:
    if path_dir not in sys.path:
        sys.path.insert(0, path_dir)

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional

try:
    from mock_servicenow.service import servicenow_mock
except ImportError:
    try:
        from service import servicenow_mock  # type: ignore
    except ImportError:
        import servicenow_mock  # type: ignore

try:
    from backend.database import get_ticket_by_id, update_ticket, record_history, get_all_tickets
except (ImportError, ValueError):
    from database import get_ticket_by_id, update_ticket, record_history, get_all_tickets  # type: ignore

router = APIRouter(prefix="/api/servicenow", tags=["ServiceNow Integration"])

@router.get("/incidents")
def list_servicenow_incidents(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    incidents = servicenow_mock.list_incidents(limit=limit, offset=offset)
    return {
        "status": "success",
        "count": len(incidents),
        "incidents": incidents
    }

@router.get("/incidents/{sys_id}")
def get_servicenow_incident(sys_id: str):
    inc = servicenow_mock.get_incident(sys_id)
    if not inc:
        raise HTTPException(status_code=404, detail="ServiceNow incident record not found")
    return {"status": "success", "incident": inc}

@router.post("/incidents", status_code=201)
def create_servicenow_incident(data: Dict[str, Any]):
    inc = servicenow_mock.create_incident(data)
    return {"status": "success", "incident": inc}

@router.patch("/incidents/{sys_id}")
def update_servicenow_incident(sys_id: str, updates: Dict[str, Any]):
    inc = servicenow_mock.update_incident(sys_id, updates)
    if not inc:
        raise HTTPException(status_code=404, detail="ServiceNow incident record not found")
    return {"status": "success", "incident": inc}

@router.post("/sync/{ticket_id}")
def sync_ticket_to_servicenow(ticket_id: str):
    ticket = get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="ITSM Ticket not found")

    existing_sys_id = ticket.get("servicenow_sys_id")
    if existing_sys_id and servicenow_mock.get_incident(existing_sys_id):
        # Update existing
        sn_record = servicenow_mock.update_incident(existing_sys_id, {
            "short_description": ticket["title"],
            "description": ticket["description"],
            "state": ticket["status"],
            "assigned_to": ticket["assigned_agent"],
            "assignment_group": ticket["assigned_team"],
            "close_notes": ticket.get("resolution_notes", "")
        })
    else:
        # Create new incident in mock ServiceNow
        sn_payload = {
            "short_description": ticket["title"],
            "description": ticket["description"],
            "caller_id": ticket["requester"],
            "priority": ticket["priority"],
            "urgency": ticket["urgency"],
            "impact": ticket["impact"],
            "state": ticket["status"],
            "assignment_group": ticket["assigned_team"],
            "assigned_to": ticket["assigned_agent"],
            "close_notes": ticket.get("resolution_notes", ""),
            "correlation_id": ticket["id"]
        }
        sn_record = servicenow_mock.create_incident(sn_payload)

        # Update local ticket with ServiceNow references
        update_ticket(
            ticket_id=ticket_id,
            updates={
                "servicenow_sys_id": sn_record["sys_id"],
                "servicenow_number": sn_record["number"]
            },
            actor="ServiceNow Integration Hub"
        )

        record_history(
            ticket_id=ticket_id,
            action="ServiceNow Incident Created",
            actor="ServiceNow Integration Hub",
            details=f"Created ServiceNow Incident #{sn_record['number']} (sys_id: {sn_record['sys_id'][:8]}...)"
        )

    updated_ticket = get_ticket_by_id(ticket_id)
    return {
        "status": "success",
        "message": f"Successfully synchronized with ServiceNow ({sn_record['number']})",
        "servicenow_incident": sn_record,
        "ticket": updated_ticket
    }

@router.post("/sync-all")
def sync_all_tickets():
    tickets = get_all_tickets(limit=100)
    synced_count = 0

    for t in tickets:
        if not t.get("servicenow_sys_id"):
            sn_payload = {
                "short_description": t["title"],
                "description": t["description"],
                "caller_id": t["requester"],
                "priority": t["priority"],
                "urgency": t["urgency"],
                "impact": t["impact"],
                "state": t["status"],
                "assignment_group": t["assigned_team"],
                "assigned_to": t["assigned_agent"],
                "correlation_id": t["id"]
            }
            sn_record = servicenow_mock.create_incident(sn_payload)
            update_ticket(
                ticket_id=t["id"],
                updates={
                    "servicenow_sys_id": sn_record["sys_id"],
                    "servicenow_number": sn_record["number"]
                },
                actor="Batch ServiceNow Sync"
            )
            synced_count += 1

    return {
        "status": "success",
        "synced_count": synced_count,
        "message": f"Successfully synchronized {synced_count} tickets to ServiceNow"
    }
