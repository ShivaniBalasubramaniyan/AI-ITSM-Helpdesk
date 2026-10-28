"""
Database Layer for AI-ITSM Helpdesk Platform
Supports dual-mode persistence:
1. MongoDB Cloud (MongoDB Atlas) via pymongo when MONGODB_URI is configured.
2. Local SQLite (itsm.db) for zero-configuration offline execution.

Provides schema initialization, live SLA recalculations, audit trails, and automatic data seeding.
"""

import os
import json
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any

# Load environment variables from .env
from dotenv import load_dotenv
backend_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(backend_dir, ".env"))

try:
    from pymongo import MongoClient, ASCENDING, DESCENDING
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False

DB_FILE = os.path.join(backend_dir, "itsm.db")
MONGODB_URI = os.getenv("MONGODB_URI", "").strip()
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "ai_itsm_db").strip() or "ai_itsm_db"

_mongo_client: Optional[Any] = None
_mongo_db: Optional[Any] = None
_mongo_active: bool = False

def mark_mongo_inactive(reason: str = ""):
    global _mongo_active
    if _mongo_active:
        print(f"[Database] MongoDB Cloud unavailable ({reason}). Seamlessly switching to local SQLite database.")
    _mongo_active = False

def is_mongo_active() -> bool:
    return bool(_mongo_active and _mongo_db is not None)

def get_active_db_type() -> str:
    return "mongodb_atlas" if is_mongo_active() else "sqlite"

def get_db_status() -> Dict[str, Any]:
    if is_mongo_active():
        try:
            t0 = datetime.now(timezone.utc)
            _mongo_db.command('ping')
            latency = round((datetime.now(timezone.utc) - t0).total_seconds() * 1000, 1)

            host = "itsm-cluster.8lrg030.mongodb.net"
            if "@" in MONGODB_URI:
                host = MONGODB_URI.split("@")[1].split("/")[0].split("?")[0]

            try:
                comment_count = _mongo_db.ticket_comments.count_documents({})
            except Exception:
                comment_count = 0

            try:
                kb_count = _mongo_db.knowledge_articles.count_documents({})
            except Exception:
                kb_count = 0

            return {
                "type": "mongodb_atlas",
                "connected": True,
                "database": MONGODB_DB_NAME,
                "cluster_host": host,
                "latency_ms": latency,
                "ticket_count": _mongo_db.tickets.count_documents({}),
                "history_count": _mongo_db.ticket_history.count_documents({}),
                "comment_count": comment_count,
                "kb_count": kb_count
            }
        except Exception as e:
            mark_mongo_inactive(str(e))
            # Fall through to SQLite stats below
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) as cnt FROM tickets")
    t_cnt = c.fetchone()["cnt"]
    c.execute("SELECT COUNT(*) as cnt FROM ticket_history")
    h_cnt = c.fetchone()["cnt"]
    try:
        c.execute("SELECT COUNT(*) as cnt FROM ticket_comments")
        cm_cnt = c.fetchone()["cnt"]
    except Exception:
        cm_cnt = 0
    conn.close()
    return {
        "type": "sqlite",
        "connected": True,
        "database": os.path.basename(DB_FILE),
        "db_file": DB_FILE,
        "ticket_count": t_cnt,
        "history_count": h_cnt,
        "comment_count": cm_cnt
    }

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

SAMPLE_TICKETS = [
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

SAMPLE_FEEDBACK = [
    ("KB001", 1), ("KB001", 1), ("KB001", 1), ("KB001", 0),
    ("KB002", 1), ("KB002", 1), ("KB002", 1), ("KB002", 1),
    ("KB003", 1), ("KB003", 1), ("KB003", 0),
    ("KB004", 1), ("KB004", 1), ("KB004", 1),
    ("KB005", 1), ("KB005", 1),
    ("KB006", 1), ("KB006", 0),
    ("KB007", 1), ("KB007", 1), ("KB007", 1),
    ("KB008", 1), ("KB008", 1)
]

def init_sqlite_db():
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

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ticket_comments (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        author TEXT NOT NULL,
        author_role TEXT NOT NULL,
        body TEXT NOT NULL,
        is_internal INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    )
    """)

    conn.commit()
    seed_sqlite_data(conn)
    conn.close()

def seed_sqlite_data(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as cnt FROM tickets")
    count = cursor.fetchone()["cnt"]

    if count > 0:
        return

    now = datetime.now(timezone.utc)
    for item in SAMPLE_TICKETS:
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

    for art_id, helpful in SAMPLE_FEEDBACK:
        cursor.execute("""
        INSERT INTO kb_feedback (article_id, helpful, timestamp)
        VALUES (?, ?, ?)
        """, (art_id, helpful, now.isoformat()))

    conn.commit()

def seed_mongo_data():
    if not is_mongo_active():
        return
    if _mongo_db.tickets.count_documents({}) > 0:
        return

    now = datetime.now(timezone.utc)
    h_counter = 1
    for item in SAMPLE_TICKETS:
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

        ticket_doc = {
            "id": item["id"],
            "title": item["title"],
            "description": item["description"],
            "requester": item["requester"],
            "department": item["department"],
            "category": item["category"],
            "priority": item["priority"],
            "urgency": item["urgency"],
            "impact": item["impact"],
            "status": item["status"],
            "assigned_agent": item["assigned_agent"],
            "assigned_team": item["assigned_team"],
            "created_at": created_iso,
            "updated_at": updated_iso,
            "resolved_at": resolved_iso,
            "sla_target_hours": sla["sla_target_hours"],
            "sla_due_at": sla["sla_due_at"],
            "sla_status": sla["sla_status"],
            "ai_classification": ai_class,
            "servicenow_sys_id": item.get("servicenow_sys_id"),
            "servicenow_number": item.get("servicenow_number"),
            "resolution_notes": item.get("resolution_notes")
        }
        _mongo_db.tickets.insert_one(ticket_doc)

        _mongo_db.ticket_history.insert_one({
            "id": h_counter,
            "ticket_id": item["id"],
            "timestamp": created_iso,
            "action": "Ticket Created",
            "actor": item["requester"],
            "details": f"Created via ITSM Portal. AI Classified as {item['category']} ({item['priority']})."
        })
        h_counter += 1

        if item["status"] != "New":
            _mongo_db.ticket_history.insert_one({
                "id": h_counter,
                "ticket_id": item["id"],
                "timestamp": (created_dt + timedelta(minutes=15)).isoformat(),
                "action": "Assigned & Status Changed",
                "actor": "System Auto-Router",
                "details": f"Assigned to {item['assigned_agent']} ({item['assigned_team']}). Status: {item['status']}."
            })
            h_counter += 1

        if item.get("servicenow_number"):
            _mongo_db.ticket_history.insert_one({
                "id": h_counter,
                "ticket_id": item["id"],
                "timestamp": (created_dt + timedelta(minutes=20)).isoformat(),
                "action": "ServiceNow Synced",
                "actor": "ServiceNow Integration Hub",
                "details": f"Bi-directional sync established. ServiceNow Incident #{item['servicenow_number']}."
            })
            h_counter += 1

        if item.get("resolved"):
            _mongo_db.ticket_history.insert_one({
                "id": h_counter,
                "ticket_id": item["id"],
                "timestamp": resolved_iso,
                "action": "Ticket Resolved",
                "actor": item["assigned_agent"],
                "details": item.get("resolution_notes", "Resolved successfully.")
            })
            h_counter += 1

    for art_id, helpful in SAMPLE_FEEDBACK:
        _mongo_db.kb_feedback.insert_one({
            "article_id": art_id,
            "helpful": helpful,
            "timestamp": now.isoformat()
        })

def init_mongo() -> bool:
    global _mongo_client, _mongo_db, _mongo_active, MONGODB_URI, MONGODB_DB_NAME
    # Re-read environment variables in case .env was recently modified
    load_dotenv(os.path.join(backend_dir, ".env"), override=True)
    MONGODB_URI = os.getenv("MONGODB_URI", "").strip()
    MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "ai_itsm_db").strip() or "ai_itsm_db"

    if not PYMONGO_AVAILABLE or not MONGODB_URI:
        _mongo_active = False
        return False

    try:
        # Configure robust public DNS resolvers for MongoDB SRV resolution
        try:
            import dns.resolver
            dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
            dns.resolver.default_resolver.nameservers = ['8.8.8.8', '1.1.1.1', '8.8.4.4']
        except Exception:
            pass

        # Connect to MongoDB Cloud Atlas
        kwargs: Dict[str, Any] = {"serverSelectionTimeoutMS": 5000}
        try:
            import certifi
            kwargs["tlsCAFile"] = certifi.where()
        except Exception:
            pass

        client = MongoClient(MONGODB_URI, **kwargs)
        client.admin.command('ping')
        _mongo_client = client
        _mongo_db = client[MONGODB_DB_NAME]
        _mongo_active = True
        print(f"[Database] Successfully connected to MongoDB Cloud Atlas! Database: '{MONGODB_DB_NAME}'")

        # Create indexes
        _mongo_db.tickets.create_index([("id", ASCENDING)], unique=True)
        _mongo_db.tickets.create_index([("created_at", DESCENDING)])
        _mongo_db.ticket_history.create_index([("ticket_id", ASCENDING), ("timestamp", ASCENDING)])
        _mongo_db.ticket_comments.create_index([("ticket_id", ASCENDING), ("created_at", ASCENDING)])
        _mongo_db.kb_feedback.create_index([("article_id", ASCENDING)])

        if _mongo_db.tickets.count_documents({}) == 0:
            print("[Database] Empty MongoDB database detected. Seeding sample ITSM tickets...")
            seed_mongo_data()

        return True
    except Exception as e:
        print(f"[Database] MongoDB Cloud connection failed ({e}). Reverting to SQLite database.")
        _mongo_active = False
        return False

def init_db():
    # Attempt MongoDB Cloud connection first
    mongo_ok = init_mongo()
    # Always ensure SQLite schema is initialized as well for seamless offline fallback
    init_sqlite_db()
    if not mongo_ok:
        print("[Database] Using local SQLite database (itsm.db). (To use MongoDB Cloud, configure MONGODB_URI in backend/.env)")

def sync_sqlite_to_mongodb() -> Dict[str, Any]:
    """Transfers all existing SQLite tickets, history, and feedback to MongoDB Cloud Atlas."""
    if not is_mongo_active():
        return {"status": "offline", "success": False, "message": "MongoDB Cloud Atlas is not currently connected (running in local SQLite mode)"}

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tickets")
    rows = cursor.fetchall()
    migrated_tickets = 0
    for r in rows:
        ticket = dict(r)
        if ticket.get("ai_classification"):
            try:
                ticket["ai_classification"] = json.loads(ticket["ai_classification"])
            except Exception:
                pass
        if not _mongo_db.tickets.find_one({"id": ticket["id"]}):
            _mongo_db.tickets.insert_one(ticket)
            migrated_tickets += 1

    cursor.execute("SELECT * FROM ticket_history")
    h_rows = cursor.fetchall()
    migrated_history = 0
    for h in h_rows:
        item = dict(h)
        if not _mongo_db.ticket_history.find_one({"ticket_id": item["ticket_id"], "timestamp": item["timestamp"]}):
            _mongo_db.ticket_history.insert_one(item)
            migrated_history += 1

    migrated_comments = 0
    try:
        cursor.execute("SELECT * FROM ticket_comments")
        cm_rows = cursor.fetchall()
        for c in cm_rows:
            c_dict = dict(c)
            c_dict["is_internal"] = bool(c_dict.get("is_internal", 1))
            if not _mongo_db.ticket_comments.find_one({"id": c_dict["id"]}):
                _mongo_db.ticket_comments.insert_one(c_dict)
                migrated_comments += 1
    except Exception:
        pass

    migrated_kb = 0
    try:
        from kb_service import kb_service
        kb_service.reload_articles()
        for art in kb_service._cache.values():
            if not _mongo_db.knowledge_articles.find_one({"id": art["id"]}):
                _mongo_db.knowledge_articles.insert_one(dict(art))
                migrated_kb += 1
    except Exception:
        pass

    conn.close()
    return {
        "status": "success",
        "success": True,
        "migrated_tickets": migrated_tickets,
        "migrated_history": migrated_history,
        "migrated_comments": migrated_comments,
        "migrated_kb": migrated_kb,
        "tickets_synced": migrated_tickets,
        "history_synced": migrated_history,
        "total_mongo_tickets": _mongo_db.tickets.count_documents({})
    }

# =====================================================================
# Database CRUD Helpers (Dual-Mode: MongoDB Cloud + SQLite Fallback)
# =====================================================================

def get_all_tickets(
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    if is_mongo_active():
        try:
            filter_q: Dict[str, Any] = {}
            if search:
                regex = {"$regex": search, "$options": "i"}
                filter_q["$or"] = [
                    {"title": regex},
                    {"description": regex},
                    {"requester": regex},
                    {"id": regex}
                ]
            if status and status.lower() != "all":
                filter_q["status"] = status
            if priority and priority.lower() != "all":
                filter_q["priority"] = priority
            if category and category.lower() != "all":
                filter_q["category"] = category

            cursor = _mongo_db.tickets.find(filter_q, {"_id": 0}).sort("created_at", DESCENDING).skip(offset).limit(limit)
            tickets = []
            for doc in cursor:
                ticket = dict(doc)
                if isinstance(ticket.get("ai_classification"), str):
                    try:
                        ticket["ai_classification"] = json.loads(ticket["ai_classification"])
                    except Exception:
                        pass
                sla = compute_sla_info(
                    priority=ticket["priority"],
                    created_at_iso=ticket["created_at"],
                    resolved_at_iso=ticket.get("resolved_at"),
                    status=ticket["status"]
                )
                ticket["sla_status"] = sla["sla_status"]
                ticket["sla_remaining_seconds"] = sla["remaining_seconds"]
                ticket["sla_remaining_hours"] = sla["remaining_hours"]
                tickets.append(ticket)
            return tickets
        except Exception as e:
            mark_mongo_inactive(str(e))

    # SQLite Fallback
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
    if is_mongo_active():
        try:
            doc = _mongo_db.tickets.find_one({"id": ticket_id}, {"_id": 0})
            if not doc:
                return None
            ticket = dict(doc)
            if isinstance(ticket.get("ai_classification"), str):
                try:
                    ticket["ai_classification"] = json.loads(ticket["ai_classification"])
                except Exception:
                    pass
            sla = compute_sla_info(
                priority=ticket["priority"],
                created_at_iso=ticket["created_at"],
                resolved_at_iso=ticket.get("resolved_at"),
                status=ticket["status"]
            )
            ticket["sla_status"] = sla["sla_status"]
            ticket["sla_remaining_seconds"] = sla["remaining_seconds"]
            ticket["sla_remaining_hours"] = sla["remaining_hours"]
            return ticket
        except Exception as e:
            mark_mongo_inactive(str(e))

    # SQLite Fallback
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
    if is_mongo_active():
        try:
            cursor = _mongo_db.ticket_history.find({"ticket_id": ticket_id}, {"_id": 0}).sort("timestamp", ASCENDING)
            return list(cursor)
        except Exception as e:
            mark_mongo_inactive(str(e))

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
    now_iso = datetime.now(timezone.utc).isoformat()
    if is_mongo_active():
        try:
            cnt = _mongo_db.ticket_history.count_documents({}) + 1
            _mongo_db.ticket_history.insert_one({
                "id": cnt,
                "ticket_id": ticket_id,
                "timestamp": now_iso,
                "action": action,
                "actor": actor,
                "details": details
            })
            return
        except Exception as e:
            mark_mongo_inactive(str(e))

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO ticket_history (ticket_id, timestamp, action, actor, details)
    VALUES (?, ?, ?, ?, ?)
    """, (ticket_id, now_iso, action, actor, details))
    conn.commit()
    conn.close()

def create_ticket(data: Dict[str, Any]) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    priority = data.get("priority", "Medium")
    status = data.get("status", "New")

    sla = compute_sla_info(
        priority=priority,
        created_at_iso=now_iso,
        status=status
    )

    ai_data = data.get("ai_classification")

    if is_mongo_active():
        try:
            highest = 1000
            for doc in _mongo_db.tickets.find({}, {"id": 1}):
                tid = str(doc.get("id") or "")
                if tid.startswith("INC-") and tid[4:].isdigit():
                    val = int(tid[4:])
                    if val > highest:
                        highest = val
            ticket_id = f"INC-{highest + 1}"

            doc = {
                "id": ticket_id,
                "title": data.get("title", "Untitled Ticket"),
                "description": data.get("description", ""),
                "requester": data.get("requester", "Standard Employee"),
                "department": data.get("department", "General"),
                "category": data.get("category", "Software"),
                "priority": priority,
                "urgency": data.get("urgency", "Medium"),
                "impact": data.get("impact", "Medium"),
                "status": status,
                "assigned_agent": data.get("assigned_agent", "Unassigned"),
                "assigned_team": data.get("assigned_team", "IT Service Desk"),
                "created_at": now_iso,
                "updated_at": now_iso,
                "resolved_at": None,
                "sla_target_hours": sla["sla_target_hours"],
                "sla_due_at": sla["sla_due_at"],
                "sla_status": sla["sla_status"],
                "ai_classification": ai_data,
                "servicenow_sys_id": data.get("servicenow_sys_id"),
                "servicenow_number": data.get("servicenow_number"),
                "resolution_notes": data.get("resolution_notes", "")
            }
            _mongo_db.tickets.insert_one(doc)

            record_history(
                ticket_id=ticket_id,
                action="Ticket Created",
                actor=data.get("requester", "Portal User"),
                details=f"Ticket registered in category '{data.get('category')}' with priority '{priority}'."
            )
            return get_ticket_by_id(ticket_id)
        except Exception as e:
            mark_mongo_inactive(str(e))

    # SQLite
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM tickets")
    rows = cursor.fetchall()
    highest = 1000
    for r in rows:
        tid = str(r["id"] or "")
        if tid.startswith("INC-") and tid[4:].isdigit():
            val = int(tid[4:])
            if val > highest:
                highest = val
    ticket_id = f"INC-{highest + 1}"

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

    now_iso = datetime.now(timezone.utc).isoformat()
    old_status = existing["status"]
    new_status = updates.get("status", old_status)
    status_changed = False

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

    if is_mongo_active():
        try:
            set_fields: Dict[str, Any] = {
                "title": updates.get("title", existing["title"]),
                "description": updates.get("description", existing["description"]),
                "requester": updates.get("requester", existing["requester"]),
                "department": updates.get("department", existing["department"]),
                "category": updates.get("category", existing["category"]),
                "priority": priority,
                "urgency": updates.get("urgency", existing["urgency"]),
                "impact": updates.get("impact", existing["impact"]),
                "status": new_status,
                "assigned_agent": updates.get("assigned_agent", existing["assigned_agent"]),
                "assigned_team": updates.get("assigned_team", existing["assigned_team"]),
                "updated_at": now_iso,
                "resolved_at": resolved_at,
                "sla_target_hours": sla["sla_target_hours"],
                "sla_due_at": sla["sla_due_at"],
                "sla_status": sla["sla_status"],
                "servicenow_sys_id": updates.get("servicenow_sys_id", existing.get("servicenow_sys_id")),
                "servicenow_number": updates.get("servicenow_number", existing.get("servicenow_number")),
                "resolution_notes": updates.get("resolution_notes", existing.get("resolution_notes", ""))
            }
            if "ai_classification" in updates:
                set_fields["ai_classification"] = updates["ai_classification"]

            _mongo_db.tickets.update_one({"id": ticket_id}, {"$set": set_fields})

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
        except Exception as e:
            mark_mongo_inactive(str(e))

    # SQLite
    conn = get_db_connection()
    cursor = conn.cursor()
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
    if is_mongo_active():
        try:
            res = _mongo_db.tickets.delete_one({"id": ticket_id})
            deleted = res.deleted_count > 0
            if deleted:
                _mongo_db.ticket_history.delete_many({"ticket_id": ticket_id})
            return deleted
        except Exception as e:
            mark_mongo_inactive(str(e))

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
    if is_mongo_active():
        try:
            docs = list(_mongo_db.tickets.find({}, {"_id": 0}))
            total_tickets = len(docs)
            open_tickets = 0
            in_progress_tickets = 0
            resolved_tickets = 0
            closed_tickets = 0
            critical_tickets = 0
            high_tickets = 0

            category_counts: Dict[str, int] = {}
            priority_counts: Dict[str, int] = {}
            sla_counts: Dict[str, int] = {"Healthy": 0, "At Risk": 0, "Breached": 0, "Met": 0}

            for t in docs:
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
                    resolved_at_iso=t.get("resolved_at"),
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
        except Exception as e:
            mark_mongo_inactive(str(e))

    # SQLite
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

    category_counts = {}
    priority_counts = {}
    sla_counts = {"Healthy": 0, "At Risk": 0, "Breached": 0, "Met": 0}

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
    now_iso = datetime.now(timezone.utc).isoformat()
    if is_mongo_active():
        try:
            _mongo_db.kb_feedback.insert_one({
                "article_id": article_id,
                "helpful": 1 if helpful else 0,
                "timestamp": now_iso
            })
            return
        except Exception as e:
            mark_mongo_inactive(str(e))

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO kb_feedback (article_id, helpful, timestamp)
    VALUES (?, ?, ?)
    """, (article_id, 1 if helpful else 0, now_iso))
    conn.commit()
    conn.close()

def get_kb_feedback_stats() -> Dict[str, Dict[str, int]]:
    if is_mongo_active():
        try:
            pipeline = [
                {"$group": {
                    "_id": "$article_id",
                    "helpful": {"$sum": {"$cond": [{"$eq": ["$helpful", 1]}, 1, 0]}},
                    "not_helpful": {"$sum": {"$cond": [{"$eq": ["$helpful", 0]}, 1, 0]}}
                }}
            ]
            res = _mongo_db.kb_feedback.aggregate(pipeline)
            stats = {}
            for r in res:
                stats[r["_id"]] = {
                    "helpful": r["helpful"] or 0,
                    "not_helpful": r["not_helpful"] or 0
                }
            return stats
        except Exception as e:
            mark_mongo_inactive(str(e))

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

def add_ticket_comment(ticket_id: str, comment_data: Dict[str, Any]) -> Dict[str, Any]:
    """Adds a public comment or internal IT work note to a ticket, with audit trail logging."""
    now_iso = datetime.now(timezone.utc).isoformat()
    cid = f"CMT-{int(datetime.now(timezone.utc).timestamp() * 1000)}"

    author = comment_data.get("author") or "IT Staff"
    author_role = comment_data.get("author_role") or "IT Support Engineer"
    body = (comment_data.get("body") or "").strip()
    is_internal = bool(comment_data.get("is_internal", False))

    record = {
        "id": cid,
        "ticket_id": ticket_id,
        "author": author,
        "author_role": author_role,
        "body": body,
        "is_internal": is_internal,
        "created_at": now_iso
    }

    if is_mongo_active():
        try:
            _mongo_db.ticket_comments.insert_one(dict(record))
            _mongo_db.tickets.update_one({"id": ticket_id}, {"$set": {"updated_at": now_iso}})
        except Exception as e:
            mark_mongo_inactive(str(e))
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO ticket_comments (id, ticket_id, author, author_role, body, is_internal, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (cid, ticket_id, author, author_role, body, 1 if is_internal else 0, now_iso))
            cursor.execute("UPDATE tickets SET updated_at = ? WHERE id = ?", (now_iso, ticket_id))
            conn.commit()
            conn.close()
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO ticket_comments (id, ticket_id, author, author_role, body, is_internal, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (cid, ticket_id, author, author_role, body, 1 if is_internal else 0, now_iso))
        cursor.execute("UPDATE tickets SET updated_at = ? WHERE id = ?", (now_iso, ticket_id))
        conn.commit()
        conn.close()

    # Record history entry
    action_label = "Work Note Added (Internal)" if is_internal else "Customer Update (Public)"
    record_history(
        ticket_id=ticket_id,
        action=action_label,
        actor=author,
        details=body[:140] + ("..." if len(body) > 140 else "")
    )

    clean = dict(record)
    clean.pop("_id", None)
    return clean

def get_ticket_comments(ticket_id: str) -> List[Dict[str, Any]]:
    """Retrieves all comments/work notes for a ticket, chronologically ordered."""
    if is_mongo_active():
        try:
            cursor = _mongo_db.ticket_comments.find(
                {"ticket_id": ticket_id},
                {"_id": 0}
            ).sort("created_at", ASCENDING)
            return list(cursor)
        except Exception as e:
            mark_mongo_inactive(str(e))

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, ticket_id, author, author_role, body, is_internal, created_at
    FROM ticket_comments
    WHERE ticket_id = ?
    ORDER BY created_at ASC
    """, (ticket_id,))
    rows = cursor.fetchall()
    conn.close()

    comments = []
    for r in rows:
        d = dict(r)
        d["is_internal"] = bool(d["is_internal"])
        comments.append(d)
    return comments

def save_knowledge_article_cloud(article_data: Dict[str, Any]):
    """Syncs a knowledge base article to MongoDB Cloud Atlas if active."""
    if is_mongo_active() and article_data:
        try:
            art_copy = dict(article_data)
            _mongo_db.knowledge_articles.update_one(
                {"id": art_copy["id"]},
                {"$set": art_copy},
                upsert=True
            )
        except Exception as e:
            print(f"[MongoDB] Could not sync KB article: {e}")
            mark_mongo_inactive(str(e))

