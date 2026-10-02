"""
SQLite Database Layer for AI-ITSM Helpdesk Platform
Provides persistence, schema migrations, sample data seeding, and transactional integrity.
Uses Python's standard library sqlite3 for zero-external-dependency local execution.
"""

import sqlite3
import json
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "itsm.db")

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def compute_sla_info(priority: str, created_at_iso: str, resolved_at_iso: Optional[str] = None, status: str = "New") -> Dict[str, Any]:
    target_hours_map = {
        "Critical": 2.0,
        "High": 4.0,
        "Medium": 8.0,
        "Low": 24.0
    }
    target_hours = target_hours_map.get(priority, 8.0)
    
    try:
        created_dt = datetime.fromisoformat(created_at_iso.replace("Z", "+00:00"))
    except Exception:
        created_dt = datetime.now(timezone.utc)

    due_dt = created_dt + timedelta(hours=target_hours)
    now_dt = datetime.now(timezone.utc)

    if status in ["Resolved", "Closed"]:
        if resolved_at_iso:
            try:
                res_dt = datetime.fromisoformat(resolved_at_iso.replace("Z", "+00:00"))
                sla_status = "Met" if res_dt <= due_dt else "Breached"
            except Exception:
                sla_status = "Met"
        else:
            sla_status = "Met"
        remaining_seconds = 0
    else:
        diff = (due_dt - now_dt).total_seconds()
        remaining_seconds = max(0, int(diff))
        if diff < 0:
            sla_status = "Breached"
        elif diff < (target_hours * 3600 * 0.25):
            sla_status = "At Risk"
        else:
            sla_status = "Healthy"

    remaining_hours = round(remaining_seconds / 3600, 1)
    
    return {
        "sla_target_hours": target_hours,
        "sla_due_at": due_dt.isoformat(),
        "sla_status": sla_status,
        "remaining_seconds": remaining_seconds,
        "remaining_hours": remaining_hours
    }

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        requester TEXT NOT NULL,
        department TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        urgency TEXT NOT NULL,
        impact TEXT NOT NULL,
        status TEXT NOT NULL,
        assigned_agent TEXT NOT NULL,
        assigned_team TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        resolved_at TEXT,
        sla_target_hours REAL NOT NULL,
        sla_due_at TEXT NOT NULL,
        sla_status TEXT NOT NULL,
        ai_classification TEXT,
        servicenow_sys_id TEXT,
        servicenow_number TEXT,
        resolution_notes TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ticket_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        details TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS kb_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id TEXT NOT NULL,
        helpful INTEGER NOT NULL,
        timestamp TEXT NOT NULL
    )
    """)

    conn.commit()
    seed_initial_data(conn)
    conn.close()

def seed_initial_data(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as cnt FROM tickets")
    count = cursor.fetchone()["cnt"]

    if count > 0:
        return

    now = datetime.now(timezone.utc)

    sample_tickets = [
        {
            "id": "INC-1001",
            "title": "Cisco AnyConnect VPN Gateway Authentication Timeout",
            "description": "User cannot connect to enterprise VPN from home network. Certificate verification fails at gateway auth.",
            "requester": "David Miller",
            "department": "Engineering",
            "category": "Network",
            "priority": "High",
            "urgency": "High",
            "impact": "Medium",
            "status": "In Progress",
            "assigned_agent": "Elena Rostova",
            "assigned_team": "Network Operations",
            "created_offset_h": 2.5,
            "resolved": False,
            "servicenow_number": "INC0010002",
            "servicenow_sys_id": "mock_sys_id_1001",
            "ai_reasoning": "Keywords matched: VPN, Gateway, Certificate. Impact isolated to remote employee. Classified as High Priority Network ticket."
        },
        {
            "id": "INC-1002",
            "title": "Self-Service Password Reset Failed & Okta Account Locked",
            "description": "Locked out of corporate Azure AD and Okta after 5 incorrect password attempts. Need urgent unlock for client presentation.",
            "requester": "Sarah Jenkins",
            "department": "Sales",
            "category": "Access & Identity",
            "priority": "High",
            "urgency": "High",
            "impact": "Low",
            "status": "Open",
            "assigned_agent": "Marcus Chen",
            "assigned_team": "Identity & Access",
            "created_offset_h": 1.2,
            "resolved": False,
            "servicenow_number": "INC0010003",
            "servicenow_sys_id": "mock_sys_id_1002",
            "ai_reasoning": "Detected account lockout and client presentation urgency. Suggested immediate identity verification."
        },
        {
            "id": "INC-1003",
            "title": "Docker Desktop & PyCharm Pro License Key Provisioning",
            "description": "New joiner in backend platform team requesting commercial license key for JetBrains PyCharm Pro and Docker subscription.",
            "requester": "Amit Patel",
            "department": "Product Engineering",
            "category": "Software",
            "priority": "Low",
            "urgency": "Low",
            "impact": "Low",
            "status": "Resolved",
            "assigned_agent": "Lisa Wong",
            "assigned_team": "IT Asset Management",
            "created_offset_h": 18.0,
            "resolved": True,
            "resolved_offset_h": 4.0,
            "servicenow_number": "INC0010004",
            "servicenow_sys_id": "mock_sys_id_1003",
            "resolution_notes": "Assigned JetBrains seat via Okta group 'grp-jetbrains-pro' and provisioned Docker business token.",
            "ai_reasoning": "Standard developer tooling provisioning request. Auto-routed to Asset Management with Low priority."
        },
        {
            "id": "INC-1004",
            "title": "Core Switch Degraded in Building 3 Floor 2 (Wi-Fi Dropping)",
            "description": "Entire floor reporting dropped Zoom video meetings and inability to associate with Corp-Secure wireless APs.",
            "requester": "Facility Operations",
            "department": "Workplace Services",
            "category": "Network",
            "priority": "Critical",
            "urgency": "High",
            "impact": "High",
            "status": "In Progress",
            "assigned_agent": "Network OnCall Lead",
            "assigned_team": "Network Operations",
            "created_offset_h": 1.1,
            "resolved": False,
            "servicenow_number": "INC0010001",
            "servicenow_sys_id": "mock_sys_id_1004",
            "ai_reasoning": "High impact site-wide network failure affecting 60+ workstations. Escalated to P1 Critical Incident."
        },
        {
            "id": "INC-1005",
            "title": "Outlook OST Corrupted - Disconnected Status on Desktop",
            "description": "Desktop Outlook client fails to sync latest mailbox items. OWA works normally. Shows 'Disconnected' error.",
            "requester": "Rachel Green",
            "department": "Finance",
            "category": "Email & Collaboration",
            "priority": "Medium",
            "urgency": "Medium",
            "impact": "Low",
            "status": "Open",
            "assigned_agent": "Alex Rivera",
            "assigned_team": "Desktop Support",
            "created_offset_h": 3.0,
            "resolved": False,
            "servicenow_number": None,
            "servicenow_sys_id": None,
            "ai_reasoning": "Detected Outlook OST sync issue. Recommended local cache rebuild from KB003."
        },
        {
            "id": "INC-1006",
            "title": "Thunderbolt 4 Docking Station External Dual Monitors Flickering",
            "description": "Dell WD19TBS dock monitors intermittently black out for 2 seconds every few minutes on Dell XPS 15.",
            "requester": "Thomas Becker",
            "department": "Marketing",
            "category": "Hardware",
            "priority": "Low",
            "urgency": "Low",
            "impact": "Low",
            "status": "New",
            "assigned_agent": "Unassigned",
            "assigned_team": "Desktop Support",
            "created_offset_h": 0.5,
            "resolved": False,
            "servicenow_number": None,
            "servicenow_sys_id": None,
            "ai_reasoning": "Hardware display dock issue. Recommended power cycle and DisplayLink driver refresh."
        },
        {
            "id": "INC-1007",
            "title": "Production PostgreSQL Read-Only IAM Role Request",
            "description": "Requesting 4-hour temporary JIT read-only access for DB audit and data reconciliation task CR-89412.",
            "requester": "Vikram Seth",
            "department": "Data Engineering",
            "category": "Access & Identity",
            "priority": "High",
            "urgency": "High",
            "impact": "Medium",
            "status": "Resolved",
            "assigned_agent": "Marcus Chen",
            "assigned_team": "Identity & Access",
            "created_offset_h": 5.0,
            "resolved": True,
            "resolved_offset_h": 3.5,
            "resolution_notes": "Approved by Engineering Director. Provisioned temporary AWS IAM AssumeRole credential valid for 4 hours.",
            "servicenow_number": "INC0010005",
            "servicenow_sys_id": "mock_sys_id_1007",
            "ai_reasoning": "JIT Production DB Access request with attached Change Request number. Verified compliance parameters."
        },
        {
            "id": "INC-1008",
            "title": "Slack Huddle Audio Crackling and Screen Share Permission Error",
            "description": "When joining Slack huddles on macOS Sequoia, mic produces robotic sound and screen sharing requires permission reset.",
            "requester": "Chloe Bennett",
            "department": "Design",
            "category": "Email & Collaboration",
            "priority": "Low",
            "urgency": "Low",
            "impact": "Low",
            "status": "Closed",
            "assigned_agent": "Alex Rivera",
            "assigned_team": "Desktop Support",
            "created_offset_h": 48.0,
            "resolved": True,
            "resolved_offset_h": 42.0,
            "resolution_notes": "Reset CoreAudio daemon and granted Screen Recording permissions in macOS System Settings.",
            "servicenow_number": None,
            "servicenow_sys_id": None,
            "ai_reasoning": "Desktop application audio/security permission conflict on macOS."
        }
    ]

    for item in sample_tickets:
        created_dt = now - timedelta(hours=item["created_offset_h"])
        created_iso = created_dt.isoformat()
        updated_iso = created_iso
        resolved_iso = None
        if item.get("resolved"):
            res_dt = now - timedelta(hours=item.get("resolved_offset_h", 1.0))
            resolved_iso = res_dt.isoformat()
            updated_iso = resolved_iso

        sla = compute_sla_info(
            priority=item["priority"],
            created_at_iso=created_iso,
            resolved_at_iso=resolved_iso,
            status=item["status"]
        )

        ai_class = {
            "category": item["category"],
            "priority": item["priority"],
            "urgency": item["urgency"],
            "suggested_team": item["assigned_team"],
            "confidence": 0.94,
            "reasoning": item["ai_reasoning"],
            "suggested_actions": [
                "Review corresponding Knowledge Base guide",
                "Verify user department and equipment serial number",
                "Run diagnostic test"
            ]
        }

        cursor.execute("""
        INSERT INTO tickets (
            id, title, description, requester, department, category, priority, urgency, impact,
            status, assigned_agent, assigned_team, created_at, updated_at, resolved_at,
            sla_target_hours, sla_due_at, sla_status, ai_classification,
            servicenow_sys_id, servicenow_number, resolution_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item["id"],
            item["title"],
            item["description"],
            item["requester"],
            item["department"],
            item["category"],
            item["priority"],
            item["urgency"],
            item["impact"],
            item["status"],
            item["assigned_agent"],
            item["assigned_team"],
            created_iso,
            updated_iso,
            resolved_iso,
            sla["sla_target_hours"],
            sla["sla_due_at"],
            sla["sla_status"],
            json.dumps(ai_class),
            item.get("servicenow_sys_id"),
            item.get("servicenow_number"),
            item.get("resolution_notes")
        ))

        # Insert history events
        cursor.execute("""
        INSERT INTO ticket_history (ticket_id, timestamp, action, actor, details)
        VALUES (?, ?, ?, ?, ?)
        """, (
            item["id"],
            created_iso,
            "Ticket Created",
            item["requester"],
            f"Created via ITSM Portal. AI Classified as {item['category']} ({item['priority']})."
        ))

        if item["status"] != "New":
            cursor.execute("""
            INSERT INTO ticket_history (ticket_id, timestamp, action, actor, details)
            VALUES (?, ?, ?, ?, ?)
            """, (
                item["id"],
                (created_dt + timedelta(minutes=15)).isoformat(),
                "Assigned & Status Changed",
                "System Auto-Router",
                f"Assigned to {item['assigned_agent']} ({item['assigned_team']}). Status: {item['status']}."
            ))

        if item.get("servicenow_number"):
            cursor.execute("""
            INSERT INTO ticket_history (ticket_id, timestamp, action, actor, details)
            VALUES (?, ?, ?, ?, ?)
            """, (
                item["id"],
                (created_dt + timedelta(minutes=20)).isoformat(),
                "ServiceNow Synced",
                "ServiceNow Integration Hub",
                f"Bi-directional sync established. ServiceNow Incident #{item['servicenow_number']}."
            ))

        if item.get("resolved"):
            cursor.execute("""
            INSERT INTO ticket_history (ticket_id, timestamp, action, actor, details)
            VALUES (?, ?, ?, ?, ?)
            """, (
                item["id"],
                resolved_iso,
                "Ticket Resolved",
                item["assigned_agent"],
                item.get("resolution_notes", "Resolved successfully.")
            ))

    # Seed feedback
    sample_feedback = [
        ("KB001", 1), ("KB001", 1), ("KB001", 1), ("KB001", 0),
        ("KB002", 1), ("KB002", 1), ("KB002", 1), ("KB002", 1),
        ("KB003", 1), ("KB003", 1), ("KB003", 0),
        ("KB004", 1), ("KB004", 1), ("KB004", 1),
        ("KB005", 1), ("KB005", 1),
        ("KB006", 1), ("KB006", 0),
        ("KB007", 1), ("KB007", 1), ("KB007", 1),
        ("KB008", 1), ("KB008", 1)
    ]
    for art_id, helpful in sample_feedback:
        cursor.execute("""
        INSERT INTO kb_feedback (article_id, helpful, timestamp)
        VALUES (?, ?, ?)
        """, (art_id, helpful, now.isoformat()))

    conn.commit()

# Database CRUD Helpers
def get_all_tickets(
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM tickets WHERE 1=1"
    params = []

    if search:
        query += " AND (title LIKE ? OR description LIKE ? OR requester LIKE ? OR id LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s, s])

    if status and status.lower() != "all":
        query += " AND status = ?"
        params.append(status)

    if priority and priority.lower() != "all":
        query += " AND priority = ?"
        params.append(priority)

    if category and category.lower() != "all":
        query += " AND category = ?"
        params.append(category)

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    tickets = []
    for r in rows:
        ticket = dict(r)
        if ticket.get("ai_classification"):
            try:
                ticket["ai_classification"] = json.loads(ticket["ai_classification"])
            except Exception:
                pass
        # Recompute dynamic live SLA
        sla = compute_sla_info(
            priority=ticket["priority"],
            created_at_iso=ticket["created_at"],
            resolved_at_iso=ticket["resolved_at"],
            status=ticket["status"]
        )
        ticket["sla_status"] = sla["sla_status"]
        ticket["sla_remaining_seconds"] = sla["remaining_seconds"]
        ticket["sla_remaining_hours"] = sla["remaining_hours"]
        tickets.append(ticket)

    conn.close()
    return tickets

def get_ticket_by_id(ticket_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    ticket = dict(row)
    if ticket.get("ai_classification"):
        try:
            ticket["ai_classification"] = json.loads(ticket["ai_classification"])
        except Exception:
            pass

    sla = compute_sla_info(
        priority=ticket["priority"],
        created_at_iso=ticket["created_at"],
        resolved_at_iso=ticket["resolved_at"],
        status=ticket["status"]
    )
    ticket["sla_status"] = sla["sla_status"]
    ticket["sla_remaining_seconds"] = sla["remaining_seconds"]
    ticket["sla_remaining_hours"] = sla["remaining_hours"]

    conn.close()
    return ticket

def get_ticket_history(ticket_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM ticket_history WHERE ticket_id = ? ORDER BY timestamp ASC",
        (ticket_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def record_history(ticket_id: str, action: str, actor: str, details: str = ""):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    INSERT INTO ticket_history (ticket_id, timestamp, action, actor, details)
    VALUES (?, ?, ?, ?, ?)
    """, (ticket_id, now_iso, action, actor, details))
    conn.commit()
    conn.close()

def create_ticket(data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()

    # Generate ticket ID
    cursor.execute("SELECT COUNT(*) as cnt FROM tickets")
    cnt = cursor.fetchone()["cnt"]
    ticket_id = f"INC-{1001 + cnt}"

    # Ensure unique ID
    cursor.execute("SELECT id FROM tickets WHERE id = ?", (ticket_id,))
    if cursor.fetchone():
        import random
        ticket_id = f"INC-{random.randint(2000, 9999)}"

    now_iso = datetime.now(timezone.utc).isoformat()
    priority = data.get("priority", "Medium")
    status = data.get("status", "New")

    sla = compute_sla_info(
        priority=priority,
        created_at_iso=now_iso,
        status=status
    )

    ai_data = data.get("ai_classification")
    ai_json = json.dumps(ai_data) if ai_data else None

    cursor.execute("""
    INSERT INTO tickets (
        id, title, description, requester, department, category, priority, urgency, impact,
        status, assigned_agent, assigned_team, created_at, updated_at, resolved_at,
        sla_target_hours, sla_due_at, sla_status, ai_classification,
        servicenow_sys_id, servicenow_number, resolution_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        ticket_id,
        data.get("title", "Untitled Ticket"),
        data.get("description", ""),
        data.get("requester", "Standard Employee"),
        data.get("department", "General"),
        data.get("category", "Software"),
        priority,
        data.get("urgency", "Medium"),
        data.get("impact", "Medium"),
        status,
        data.get("assigned_agent", "Unassigned"),
        data.get("assigned_team", "IT Service Desk"),
        now_iso,
        now_iso,
        None,
        sla["sla_target_hours"],
        sla["sla_due_at"],
        sla["sla_status"],
        ai_json,
        data.get("servicenow_sys_id"),
        data.get("servicenow_number"),
        data.get("resolution_notes", "")
    ))

    conn.commit()
    conn.close()

    record_history(
        ticket_id=ticket_id,
        action="Ticket Created",
        actor=data.get("requester", "Portal User"),
        details=f"Ticket registered in category '{data.get('category')}' with priority '{priority}'."
    )

    return get_ticket_by_id(ticket_id)

def update_ticket(ticket_id: str, updates: Dict[str, Any], actor: str = "IT Staff") -> Optional[Dict[str, Any]]:
    existing = get_ticket_by_id(ticket_id)
    if not existing:
        return None

    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    status_changed = False
    old_status = existing["status"]
    new_status = updates.get("status", old_status)

    resolved_at = existing["resolved_at"]
    if new_status in ["Resolved", "Closed"] and old_status not in ["Resolved", "Closed"]:
        resolved_at = now_iso
        status_changed = True
    elif new_status not in ["Resolved", "Closed"] and old_status in ["Resolved", "Closed"]:
        resolved_at = None
        status_changed = True
    elif new_status != old_status:
        status_changed = True

    priority = updates.get("priority", existing["priority"])
    sla = compute_sla_info(
        priority=priority,
        created_at_iso=existing["created_at"],
        resolved_at_iso=resolved_at,
        status=new_status
    )

    ai_data = updates.get("ai_classification", existing.get("ai_classification"))
    ai_json = json.dumps(ai_data) if (ai_data and not isinstance(ai_data, str)) else (ai_data if isinstance(ai_data, str) else None)

    cursor.execute("""
    UPDATE tickets SET
        title = ?,
        description = ?,
        requester = ?,
        department = ?,
        category = ?,
        priority = ?,
        urgency = ?,
        impact = ?,
        status = ?,
        assigned_agent = ?,
        assigned_team = ?,
        updated_at = ?,
        resolved_at = ?,
        sla_target_hours = ?,
        sla_due_at = ?,
        sla_status = ?,
        ai_classification = ?,
        servicenow_sys_id = ?,
        servicenow_number = ?,
        resolution_notes = ?
    WHERE id = ?
    """, (
        updates.get("title", existing["title"]),
        updates.get("description", existing["description"]),
        updates.get("requester", existing["requester"]),
        updates.get("department", existing["department"]),
        updates.get("category", existing["category"]),
        priority,
        updates.get("urgency", existing["urgency"]),
        updates.get("impact", existing["impact"]),
        new_status,
        updates.get("assigned_agent", existing["assigned_agent"]),
        updates.get("assigned_team", existing["assigned_team"]),
        now_iso,
        resolved_at,
        sla["sla_target_hours"],
        sla["sla_due_at"],
        sla["sla_status"],
        ai_json,
        updates.get("servicenow_sys_id", existing.get("servicenow_sys_id")),
        updates.get("servicenow_number", existing.get("servicenow_number")),
        updates.get("resolution_notes", existing.get("resolution_notes", "")),
        ticket_id
    ))

    conn.commit()
    conn.close()

    # Record history
    if status_changed:
        record_history(
            ticket_id=ticket_id,
            action=f"Status Changed: {old_status} -> {new_status}",
            actor=actor,
            details=updates.get("resolution_notes", f"Status transitioned to {new_status}.")
        )
    else:
        record_history(
            ticket_id=ticket_id,
            action="Ticket Updated",
            actor=actor,
            details="Field updates committed."
        )

    return get_ticket_by_id(ticket_id)

def delete_ticket(ticket_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
    deleted = cursor.rowcount > 0
    if deleted:
        cursor.execute("DELETE FROM ticket_history WHERE ticket_id = ?", (ticket_id,))
    conn.commit()
    conn.close()
    return deleted

def get_dashboard_statistics() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tickets")
    rows = cursor.fetchall()
    conn.close()

    total_tickets = len(rows)
    open_tickets = 0
    in_progress_tickets = 0
    resolved_tickets = 0
    closed_tickets = 0
    critical_tickets = 0
    high_tickets = 0

    category_counts: Dict[str, int] = {}
    priority_counts: Dict[str, int] = {}
    sla_counts: Dict[str, int] = {"Healthy": 0, "At Risk": 0, "Breached": 0, "Met": 0}

    for r in rows:
        t = dict(r)
        status = t["status"]
        priority = t["priority"]
        cat = t["category"]

        if status in ["New", "Open"]:
            open_tickets += 1
        elif status == "In Progress":
            in_progress_tickets += 1
        elif status == "Resolved":
            resolved_tickets += 1
        elif status == "Closed":
            closed_tickets += 1

        if priority == "Critical":
            critical_tickets += 1
        elif priority == "High":
            high_tickets += 1

        category_counts[cat] = category_counts.get(cat, 0) + 1
        priority_counts[priority] = priority_counts.get(priority, 0) + 1

        sla = compute_sla_info(
            priority=priority,
            created_at_iso=t["created_at"],
            resolved_at_iso=t["resolved_at"],
            status=status
        )
        s_status = sla["sla_status"]
        if s_status in sla_counts:
            sla_counts[s_status] += 1

    sla_compliance_rate = 0.0
    if total_tickets > 0:
        compliant = sla_counts["Healthy"] + sla_counts["Met"]
        sla_compliance_rate = round((compliant / total_tickets) * 100, 1)

    return {
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "in_progress_tickets": in_progress_tickets,
        "resolved_tickets": resolved_tickets,
        "closed_tickets": closed_tickets,
        "critical_tickets": critical_tickets,
        "high_priority_tickets": high_tickets,
        "critical_and_high": critical_tickets + high_tickets,
        "sla_compliance_rate": sla_compliance_rate,
        "sla_breakdown": sla_counts,
        "category_distribution": category_counts,
        "priority_distribution": priority_counts
    }

def record_kb_feedback(article_id: str, helpful: bool):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO kb_feedback (article_id, helpful, timestamp)
    VALUES (?, ?, ?)
    """, (article_id, 1 if helpful else 0, datetime.now(timezone.utc).isoformat()))
    conn.commit()
    conn.close()

def get_kb_feedback_stats() -> Dict[str, Dict[str, int]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT article_id,
           SUM(CASE WHEN helpful = 1 THEN 1 ELSE 0 END) as helpful_count,
           SUM(CASE WHEN helpful = 0 THEN 1 ELSE 0 END) as not_helpful_count
    FROM kb_feedback
    GROUP BY article_id
    """)
    rows = cursor.fetchall()
    conn.close()
    stats = {}
    for r in rows:
        stats[r["article_id"]] = {
            "helpful": r["helpful_count"] or 0,
            "not_helpful": r["not_helpful_count"] or 0
        }
    return stats
