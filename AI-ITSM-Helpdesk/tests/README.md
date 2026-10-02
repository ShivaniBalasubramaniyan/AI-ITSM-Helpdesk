# Automated Test Suites

## Running the Automated Test Suite

Ensure the backend server is running on `http://127.0.0.1:8000`.

Execute from project root (`AI-ITSM-Helpdesk`):
```powershell
python -m unittest tests/test_api.py
```

Or using pytest:
```powershell
pytest tests/test_api.py -v
```

### Coverage
- `test_01_health_check`: Validates `/api/health` returns status healthy.
- `test_02_dashboard_statistics`: Validates SLA compliance score and breakdown counts.
- `test_03_list_tickets_and_filtering`: Tests status, priority, and category filters.
- `test_04_create_ticket_with_ai_auto_classification`: Validates AI auto-tagging on creation.
- `test_05_get_ticket_details`: Validates retrieving ticket by ID with live SLA data.
- `test_06_ticket_status_transition_and_history`: Tests workflow transition and audit logging.
- `test_07_ai_classification_endpoint`: Tests AI reasoning, confidence, and recommended actions.
- `test_08_ai_assistant_rag`: Tests RAG retrieval from knowledge base and ticket escalation payload.
- `test_09_knowledge_base_list_and_detail`: Tests article search, category filtering, and markdown retrieval.
- `test_10_knowledge_base_feedback`: Tests submitting thumbs-up helpfulness feedback.
- `test_11_servicenow_sync`: Tests bi-directional sync to Mock ServiceNow Table API.
- `test_12_delete_ticket`: Tests incident deletion and audit log cleanup.
