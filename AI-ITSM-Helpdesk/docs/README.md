# AI-Powered ITSM Platform Architecture & Technical Reference

## Architecture Overview
The platform connects an AI Classification & RAG Assistant Engine with a reactive ITSM incident workflow and a bi-directional ServiceNow Table API connector.

```
+-------------------------------------------------------------------------------+
|                             REACT + VITE FRONTEND                             |
|  - Modern Dark ITSM Console                                                  |
|  - Real-Time AI Auto-Classification Form                                      |
|  - SLA Dynamic Countdown & Compliance Bar                                     |
|  - Conversational RAG Assistant with 1-Click Ticket Escalation               |
|  - Interactive Knowledge Base & Helpfulness Feedback                         |
|  - ServiceNow Integration Console                                             |
+---------------------------------------+---------------------------------------+
                                        | (REST JSON via /api)
+---------------------------------------v---------------------------------------+
|                            FASTAPI REST BACKEND                               |
|  - GET  /api/health                                                           |
|  - GET, POST, PUT, DELETE /api/tickets                                        |
|  - POST /api/tickets/{id}/transition                                          |
|  - GET  /api/tickets/{id}/history                                             |
|  - POST /api/ai/classify                                                      |
|  - POST /api/ai/assistant                                                     |
|  - GET  /api/dashboard/stats                                                  |
|  - GET  /api/knowledge & POST /api/knowledge/{id}/feedback                   |
|  - POST /api/servicenow/sync/{ticket_id}                                      |
+-------------------+-------------------+-------------------+-------------------+
                    |                   |                   |
+-------------------v---+ +-------------v-----+ +-----------v-----+ +-----------v-----+
|    SQLite Persistence | | AI Classification | |  Knowledge Base | | Mock ServiceNow |
|  - itsm.db            | |  & RAG Engine     | |  - KB001-KB008  | |  Table API      |
|  - Tickets table      | |  - Taxonomy Rules | |  - Markdown     | |  (/api/now/     |
|  - History audit log  | |  - NLP Keyword    | |  - Metadata     | |   table/        |
|  - KB Feedback stats  | |  - LLM Fallback   | |  - Tag Index    | |   incident)     |
+-----------------------+ +-------------------+ +-----------------+ +-----------------+
```

## SLA Calculation Logic
SLA targets are defined by incident priority:
- **P1 Critical**: 2.0 hours
- **P2 High**: 4.0 hours
- **P3 Medium**: 8.0 hours
- **P4 Low**: 24.0 hours

Dynamic SLA states:
- **Healthy**: Ticket is active and remaining time > 25% of SLA target.
- **At Risk**: Ticket is active and remaining time <= 25% of SLA target.
- **Breached**: Current time has passed SLA due date before resolution.
- **Met**: Ticket status reached `Resolved` or `Closed` prior to SLA due date.

## Mock ServiceNow Table API Specification
The simulated service conforms to the ServiceNow Table API:
- Endpoint: `/api/now/table/incident`
- Fields mapped: `sys_id`, `number`, `short_description`, `description`, `caller_id`, `priority`, `urgency`, `impact`, `state`, `incident_state`, `assignment_group`, `assigned_to`, `correlation_id`.
