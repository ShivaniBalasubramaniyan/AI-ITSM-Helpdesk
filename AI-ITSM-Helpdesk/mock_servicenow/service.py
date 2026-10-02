"""
Mock ServiceNow Service
Simulates ServiceNow Table API (/api/now/table/incident) for enterprise ITSM integration.
Provides realistic incident lifecycle management without requiring paid cloud credentials.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

class MockServiceNowService:
    def __init__(self):
        self._incidents: Dict[str, Dict[str, Any]] = {}
        self._counter = 10001
        self._seed_initial_incidents()

    def _generate_incident_number(self) -> str:
        self._counter += 1
        return f"INC{self._counter:07d}"

    def _seed_initial_incidents(self):
        initial_records = [
            {
                "short_description": "Core switch failure on Building 3 Floor 2",
                "description": "Network switch stack unreachability causing Wi-Fi AP drops for entire floor.",
                "caller_id": "network.monitoring@company.com",
                "priority": "1 - Critical",
                "urgency": "1 - High",
                "impact": "1 - High",
                "state": "In Progress",
                "incident_state": "2",
                "assignment_group": "Network Operations",
                "assigned_to": "Marcus Chen",
                "close_notes": "",
            },
            {
                "short_description": "GlobalProtect VPN Gateway Certificate Renewal",
                "description": "SSL certificate expired on Europe West gateway endpoint.",
                "caller_id": "security.ops@company.com",
                "priority": "2 - High",
                "urgency": "2 - Medium",
                "impact": "1 - High",
                "state": "Resolved",
                "incident_state": "6",
                "assignment_group": "Infra Security",
                "assigned_to": "Elena Rostova",
                "close_notes": "Certificate renewed via Let's Encrypt automated pipeline and cert-manager.",
            },
            {
                "short_description": "Bulk PyCharm Pro License Key Allocation",
                "description": "Quarterly developer onboarding batch licenses for data engineering team.",
                "caller_id": "engineering.lead@company.com",
                "priority": "3 - Moderate",
                "urgency": "3 - Low",
                "impact": "2 - Medium",
                "state": "New",
                "incident_state": "1",
                "assignment_group": "IT Asset Management",
                "assigned_to": "David Miller",
                "close_notes": "",
            }
        ]

        for item in initial_records:
            sys_id = uuid.uuid4().hex
            inc_number = self._generate_incident_number()
            now_iso = datetime.now(timezone.utc).isoformat()
            self._incidents[sys_id] = {
                "sys_id": sys_id,
                "number": inc_number,
                "short_description": item["short_description"],
                "description": item["description"],
                "caller_id": item["caller_id"],
                "priority": item["priority"],
                "urgency": item["urgency"],
                "impact": item["impact"],
                "state": item["state"],
                "incident_state": item["incident_state"],
                "assignment_group": item["assignment_group"],
                "assigned_to": item["assigned_to"],
                "close_notes": item.get("close_notes", ""),
                "sys_created_on": now_iso,
                "sys_updated_on": now_iso,
                "correlation_id": ""
            }

    def list_incidents(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        records = sorted(
            list(self._incidents.values()),
            key=lambda x: x["sys_created_on"],
            reverse=True
        )
        return records[offset:offset + limit]

    def get_incident(self, sys_id: str) -> Optional[Dict[str, Any]]:
        return self._incidents.get(sys_id)

    def find_by_number(self, number: str) -> Optional[Dict[str, Any]]:
        for inc in self._incidents.values():
            if inc["number"].lower() == number.lower():
                return inc
        return None

    def find_by_correlation_id(self, correlation_id: str) -> Optional[Dict[str, Any]]:
        for inc in self._incidents.values():
            if inc.get("correlation_id") == correlation_id:
                return inc
        return None

    def create_incident(self, data: Dict[str, Any]) -> Dict[str, Any]:
        sys_id = uuid.uuid4().hex
        now_iso = datetime.now(timezone.utc).isoformat()
        number = self._generate_incident_number()

        # Map state string to ServiceNow numeric state
        state_map = {
            "New": "1",
            "Open": "1",
            "In Progress": "2",
            "On Hold": "3",
            "Resolved": "6",
            "Closed": "7"
        }
        state = data.get("state", "New")
        incident_state = state_map.get(state, "1")

        record = {
            "sys_id": sys_id,
            "number": number,
            "short_description": data.get("short_description", data.get("title", "IT Incident")),
            "description": data.get("description", ""),
            "caller_id": data.get("caller_id", data.get("requester", "system.user@company.com")),
            "priority": data.get("priority", "3 - Moderate"),
            "urgency": data.get("urgency", "2 - Medium"),
            "impact": data.get("impact", "2 - Medium"),
            "state": state,
            "incident_state": incident_state,
            "assignment_group": data.get("assignment_group", data.get("assigned_team", "IT Service Desk")),
            "assigned_to": data.get("assigned_to", data.get("assigned_agent", "Unassigned")),
            "close_notes": data.get("close_notes", ""),
            "sys_created_on": now_iso,
            "sys_updated_on": now_iso,
            "correlation_id": data.get("correlation_id", "")
        }

        self._incidents[sys_id] = record
        return record

    def update_incident(self, sys_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if sys_id not in self._incidents:
            return None

        record = self._incidents[sys_id]
        now_iso = datetime.now(timezone.utc).isoformat()

        state_map = {
            "New": "1",
            "Open": "1",
            "In Progress": "2",
            "On Hold": "3",
            "Resolved": "6",
            "Closed": "7"
        }

        for k, v in updates.items():
            if k == "state":
                record["state"] = v
                record["incident_state"] = state_map.get(v, record.get("incident_state", "1"))
            elif k != "sys_id" and k != "number" and k != "sys_created_on":
                record[k] = v

        record["sys_updated_on"] = now_iso
        self._incidents[sys_id] = record
        return record

    def delete_incident(self, sys_id: str) -> bool:
        if sys_id in self._incidents:
            del self._incidents[sys_id]
            return True
        return False

# Global singleton
servicenow_mock = MockServiceNowService()
