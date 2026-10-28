"""
Automated Test Suite for AI-ITSM Helpdesk Automation Platform
Tests all critical REST endpoints, AI classification, conversational RAG assistant,
SLA monitoring calculations, knowledge base operations, and ServiceNow sync.
Uses requests (or urllib) against the running server for true end-to-end validation.
"""

import os
import sys
import unittest
import json
try:
    import requests
except ImportError:
    import urllib.request
    import urllib.parse

    class RequestsShim:
        def __init__(self, base_url):
            self.base_url = base_url.rstrip("/")

        def _req(self, method, path, json_data=None, params=None):
            url = f"{self.base_url}{path}"
            if params:
                query_string = urllib.parse.urlencode(params)
                url += f"?{query_string}"
            headers = {"Content-Type": "application/json"}
            data = json.dumps(json_data).encode("utf-8") if json_data else None
            req = urllib.request.Request(url, data=data, headers=headers, method=method)
            try:
                with urllib.request.urlopen(req) as resp:
                    code = resp.getcode()
                    content = resp.read().decode("utf-8")
                    return type("Response", (), {"status_code": code, "json": lambda: json.loads(content), "text": content})()
            except urllib.error.HTTPError as e:
                content = e.read().decode("utf-8")
                return type("Response", (), {"status_code": e.code, "json": lambda: json.loads(content) if content else {}, "text": content})()

        def get(self, path, params=None):
            return self._req("GET", path, params=params)

        def post(self, path, json=None):
            return self._req("POST", path, json_data=json)

        def put(self, path, json=None):
            return self._req("PUT", path, json_data=json)

        def delete(self, path):
            return self._req("DELETE", path)

BASE_URL = os.getenv("ITSM_API_URL", "http://127.0.0.1:8001")

class ClientHelper:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url.rstrip("/")

    def get(self, endpoint, params=None):
        import requests
        return requests.get(f"{self.base_url}{endpoint}", params=params, timeout=10)

    def post(self, endpoint, json=None):
        import requests
        return requests.post(f"{self.base_url}{endpoint}", json=json, timeout=10)

    def put(self, endpoint, json=None):
        import requests
        return requests.put(f"{self.base_url}{endpoint}", json=json, timeout=10)

    def delete(self, endpoint):
        import requests
        return requests.delete(f"{self.base_url}{endpoint}", timeout=10)

class TestAIITSMPlatform(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = ClientHelper()

    def test_01_health_check(self):
        """Verify the health check endpoint returns 200 and healthy status."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["application"], "AI-ITSM")
        self.assertIn("modules", data)

    def test_02_dashboard_statistics(self):
        """Verify dashboard statistics computation."""
        response = self.client.get("/api/dashboard/stats")
        self.assertEqual(response.status_code, 200)
        stats = response.json()
        self.assertIn("total_tickets", stats)
        self.assertGreaterEqual(stats["total_tickets"], 1)
        self.assertIn("sla_compliance_rate", stats)
        self.assertIn("sla_breakdown", stats)
        self.assertIn("category_distribution", stats)
        self.assertIn("priority_distribution", stats)

    def test_03_list_tickets_and_filtering(self):
        """Verify tickets listing and query parameters."""
        response = self.client.get("/api/tickets")
        self.assertEqual(response.status_code, 200)
        tickets = response.json()
        self.assertIsInstance(tickets, list)
        self.assertGreaterEqual(len(tickets), 1)

        # Filter by status
        res_filter = self.client.get("/api/tickets", params={"status": "Resolved"})
        self.assertEqual(res_filter.status_code, 200)
        for t in res_filter.json():
            self.assertEqual(t["status"], "Resolved")

    def test_04_create_ticket_with_ai_auto_classification(self):
        """Verify ticket creation automatically predicts category, priority, and SLA."""
        payload = {
            "title": "Cisco AnyConnect VPN Gateway Disconnected",
            "description": "User cannot connect to enterprise VPN from home. Certificate handshake timeout.",
            "requester": "Automation Test User",
            "department": "Engineering"
        }
        response = self.client.post("/api/tickets", json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data["id"].startswith("INC-"))
        self.assertEqual(data["category"], "Network")
        self.assertIn(data["priority"], ["High", "Critical"])
        self.assertIn("sla_status", data)
        self.assertIsNotNone(data["ai_classification"])

        self.__class__.created_ticket_id = data["id"]

    def test_05_get_ticket_details(self):
        """Verify retrieving single ticket details."""
        ticket_id = getattr(self.__class__, "created_ticket_id", "INC-1001")
        response = self.client.get(f"/api/tickets/{ticket_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], ticket_id)
        self.assertIn("sla_remaining_hours", data)

    def test_06_ticket_status_transition_and_history(self):
        """Verify automated workflow transition and audit history logging."""
        ticket_id = getattr(self.__class__, "created_ticket_id", "INC-1001")
        
        # Transition to In Progress
        res = self.client.post(
            f"/api/tickets/{ticket_id}/transition",
            json={"status": "In Progress", "actor": "Test Agent", "resolution_notes": "Investigating logs"}
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "In Progress")

        # Check history
        hist_res = self.client.get(f"/api/tickets/{ticket_id}/history")
        self.assertEqual(hist_res.status_code, 200)
        history = hist_res.json()
        self.assertGreaterEqual(len(history), 2)
        actions = [h["action"] for h in history]
        self.assertTrue(any("Status Changed" in a for a in actions))

    def test_07_ai_classification_endpoint(self):
        """Verify AI classification endpoint provides confidence, reasoning, and suggested team."""
        payload = {
            "title": "Production DB locked out and database connection pool exhausted",
            "description": "Entire checkout API is returning HTTP 500. Immediate emergency assistance required."
        }
        response = self.client.post("/api/ai/classify", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn(data["category"], ["Network", "Access & Identity", "Software", "Hardware", "Email & Collaboration", "Security"])
        self.assertIn(data["priority"], ["Critical", "High"])
        self.assertGreater(data["confidence"], 0.70)
        self.assertTrue(len(data["reasoning"]) > 20)
        self.assertIsInstance(data["suggested_actions"], list)

    def test_08_ai_assistant_rag(self):
        """Verify AI Assistant retrieves knowledge base articles and produces troubleshooting steps."""
        payload = {
            "message": "How do I fix my Cisco AnyConnect VPN certificate error?",
            "history": []
        }
        response = self.client.post("/api/ai/assistant", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("reply", data)
        self.assertGreaterEqual(len(data["troubleshooting_steps"]), 1)
        self.assertGreaterEqual(len(data["suggested_kb_articles"]), 1)
        self.assertEqual(data["suggested_kb_articles"][0]["id"], "KB001")
        self.assertIsNotNone(data["suggested_ticket"])

    def test_09_knowledge_base_list_and_detail(self):
        """Verify knowledge base listing, filtering, search, and article retrieval."""
        res_list = self.client.get("/api/knowledge")
        self.assertEqual(res_list.status_code, 200)
        articles = res_list.json()
        self.assertGreaterEqual(len(articles), 5)

        # Search
        res_search = self.client.get("/api/knowledge", params={"search": "password"})
        self.assertEqual(res_search.status_code, 200)
        self.assertGreaterEqual(len(res_search.json()), 1)

        # Get detail
        res_detail = self.client.get("/api/knowledge/KB001")
        self.assertEqual(res_detail.status_code, 200)
        detail = res_detail.json()
        self.assertEqual(detail["id"], "KB001")
        self.assertIn("content", detail)

    def test_10_knowledge_base_feedback(self):
        """Verify voting helpful on a knowledge base article."""
        response = self.client.post("/api/knowledge/KB001/feedback", json={"helpful": True})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")

    def test_11_servicenow_sync(self):
        """Verify syncing local ticket to Mock ServiceNow Table API."""
        ticket_id = getattr(self.__class__, "created_ticket_id", "INC-1005")
        response = self.client.post(f"/api/servicenow/sync/{ticket_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("servicenow_incident", data)
        self.assertTrue(data["servicenow_incident"]["number"].startswith("INC"))

        # Verify incident is in ServiceNow list
        sn_list = self.client.get("/api/servicenow/incidents")
        self.assertEqual(sn_list.status_code, 200)
        numbers = [item["number"] for item in sn_list.json()["incidents"]]
        self.assertIn(data["servicenow_incident"]["number"], numbers)

    def test_12_delete_ticket(self):
        """Verify ticket deletion and cleanup."""
        if hasattr(self.__class__, "created_ticket_id"):
            ticket_id = self.__class__.created_ticket_id
            response = self.client.delete(f"/api/tickets/{ticket_id}")
            self.assertEqual(response.status_code, 200)

            # Confirm 404
            get_res = self.client.get(f"/api/tickets/{ticket_id}")
            self.assertEqual(get_res.status_code, 404)

    def test_13_bulk_operations(self):
        """Verify bulk update and status changes across multiple tickets."""
        response = self.client.post("/api/tickets/bulk", json={
            "ticket_ids": ["INC-1001", "INC-1002"],
            "action": "priority",
            "priority": "High"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["action"], "priority")
        self.assertGreaterEqual(data["affected_count"], 1)

    def test_14_csv_export(self):
        """Verify CSV export of tickets dataset."""
        response = self.client.get("/api/tickets/export/csv")
        self.assertEqual(response.status_code, 200)
        lines = response.text.splitlines()
        self.assertGreaterEqual(len(lines), 2)
        self.assertIn("Ticket ID", lines[0])

    def test_15_ai_diagnosis(self):
        """Verify AI root cause diagnosis and runbook matching."""
        response = self.client.get("/api/tickets/INC-1001/ai-diagnosis")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["ticket_id"], "INC-1001")
        self.assertIn("root_cause", data)
        self.assertIn("blast_radius", data)
        self.assertIn("prevention_recommendation", data)
        self.assertIsInstance(data["checklist"], list)
        self.assertGreaterEqual(len(data["checklist"]), 1)
        self.assertTrue(data["can_auto_resolve"])

    def test_16_ai_auto_resolve(self):
        """Verify 1-click auto-resolve updates ticket to Resolved with resolution notes and audit log."""
        # Create a temporary ticket to auto-resolve
        create_res = self.client.post("/api/tickets", json={
            "title": "Thunderbolt 4 dual monitor flickering",
            "description": "External monitors flicker and disconnect every 5 minutes when docked.",
            "requester": "Auto-Resolve Test Engineer",
            "department": "Engineering"
        })
        self.assertEqual(create_res.status_code, 201)
        ticket_id = create_res.json()["id"]

        resolve_res = self.client.post(f"/api/tickets/{ticket_id}/ai-resolve", json={
            "resolution_notes": "Discharged dock power capacitors and upgraded DisplayLink driver via Runbook KB006.",
            "actor": "AI Autonomous Resolver (Test)"
        })
        self.assertEqual(resolve_res.status_code, 200)
        resolved_data = resolve_res.json()
        self.assertEqual(resolved_data["status"], "Resolved")
        self.assertIn("Runbook KB006", resolved_data["resolution_notes"])
        self.assertIsNotNone(resolved_data["resolved_at"])

        # Clean up
        self.client.delete(f"/api/tickets/{ticket_id}")

    def test_17_add_and_list_ticket_comments(self):
        """Verify adding internal work notes and public comments to tickets."""
        # 1. Add internal work note
        post_res = self.client.post("/api/tickets/INC-1001/comments", json={
            "body": "Executed test ping on US-East VPN tunnel gateway. Latency 14ms.",
            "author": "Elena Rostova",
            "author_role": "Network Operations",
            "is_internal": True
        })
        self.assertEqual(post_res.status_code, 201)
        cmt = post_res.json()
        self.assertEqual(cmt["ticket_id"], "INC-1001")
        self.assertEqual(cmt["author"], "Elena Rostova")
        self.assertTrue(cmt["is_internal"])
        self.assertIn("US-East VPN", cmt["body"])

        # 2. Add public comment
        pub_res = self.client.post("/api/tickets/INC-1001/comments", json={
            "body": "User contacted and asked to restart Cisco AnyConnect client.",
            "author": "Elena Rostova",
            "author_role": "Desktop Support",
            "is_internal": False
        })
        self.assertEqual(pub_res.status_code, 201)
        self.assertFalse(pub_res.json()["is_internal"])

        # 3. Retrieve all comments
        get_res = self.client.get("/api/tickets/INC-1001/comments")
        self.assertEqual(get_res.status_code, 200)
        comments = get_res.json()
        self.assertGreaterEqual(len(comments), 2)
        bodies = [c["body"] for c in comments]
        self.assertTrue(any("US-East VPN" in b for b in bodies))

    def test_18_database_status_and_sync(self):
        """Verify database status telemetry and MongoDB Atlas sync endpoint."""
        # 1. Database status
        status_res = self.client.get("/api/database/status")
        self.assertEqual(status_res.status_code, 200)
        status_data = status_res.json()
        self.assertTrue(status_data.get("connected"))
        self.assertIn(status_data.get("type"), ["mongodb_atlas", "sqlite"])
        self.assertGreaterEqual(status_data.get("ticket_count", 0), 1)

        # 2. Sync to MongoDB
        sync_res = self.client.post("/api/database/sync-to-mongodb")
        self.assertEqual(sync_res.status_code, 200)
        sync_data = sync_res.json()
        self.assertIn("success", sync_data)

        # 3. Dashboard stats
        stats_res = self.client.get("/api/dashboard/stats")
        self.assertEqual(stats_res.status_code, 200)
        stats = stats_res.json()
        self.assertGreaterEqual(stats.get("total_tickets", 0), 1)
        self.assertIn("category_distribution", stats)
        self.assertIn("sla_breakdown", stats)

    def test_19_create_knowledge_runbook(self):
        """Verify authoring and indexing a new IT SOP runbook."""
        payload = {
            "title": "PostgreSQL Replica Lag & Connection Saturation",
            "category": "Database & Cloud",
            "tags": ["postgresql", "replica-lag", "rds", "connections"],
            "summary": "Standard operating procedure for investigating write-ahead log (WAL) sender latency and pooling exhaustion.",
            "content": "## Symptoms\n- Read replicas lag behind primary by > 60 seconds\n- Max connection errors (error 53300)\n\n## Resolution\n1. Check pg_stat_replication\n2. Kill idle connections in transaction\n3. Restart pgbouncer pooler",
            "author": "Database Reliability Engineering"
        }
        res = self.client.post("/api/knowledge", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data["id"].startswith("KB"))
        self.assertEqual(data["title"], payload["title"])
        self.assertEqual(data["category"], payload["category"])
        self.assertIn("postgresql", data["tags"])

        # Fetch detail
        detail_res = self.client.get(f"/api/knowledge/{data['id']}")
        self.assertEqual(detail_res.status_code, 200)
        self.assertIn("pg_stat_replication", detail_res.json()["content"])

        # Search index
        search_res = self.client.get("/api/knowledge", params={"search": "postgresql"})
        self.assertEqual(search_res.status_code, 200)
        search_ids = [item["id"] for item in search_res.json()]
        self.assertIn(data["id"], search_ids)

if __name__ == "__main__":
    unittest.main()
