# Mock ServiceNow REST Service

Simulates the ServiceNow Table API (`/api/now/table/incident`) for ITSM incident synchronization without requiring cloud ServiceNow credentials.

## Capabilities
- Realistic 32-character hexadecimal `sys_id` and formatted incident numbers (`INC0010001`, `INC0010002`).
- Bi-directional sync with ITSM incidents via `correlation_id`.
- Support for Table API CRUD endpoints:
  - `GET /api/now/table/incident`
  - `GET /api/now/table/incident/{sys_id}`
  - `POST /api/now/table/incident`
  - `PATCH /api/now/table/incident/{sys_id}`
  - `DELETE /api/now/table/incident/{sys_id}`

## Running Independently (Optional)
The Mock ServiceNow service is automatically integrated into the main backend at `/api/servicenow/...`. If you wish to run a dedicated mock server on port 8001:
```powershell
python -m mock_servicenow.server
```
