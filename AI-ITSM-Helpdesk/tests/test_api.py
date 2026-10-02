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

BASE_URL = os.getenv("ITSM_API_URL", "http://127.0.0.1:8000")

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

if __name__ == "__main__":
    unittest.main()
