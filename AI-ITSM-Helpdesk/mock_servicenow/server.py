"""
Standalone Mock ServiceNow REST API Server
Simulates standard ServiceNow Table API endpoint /api/now/table/incident.
Can run independently on port 8001 or integrated within the main ITSM application.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any
from .service import servicenow_mock

mock_app = FastAPI(
    title="ServiceNow Table API Mock Service",
    description="Simulated ServiceNow REST Table API for ITSM incident synchronization.",
    version="1.0.0"
)

mock_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@mock_app.get("/api/now/table/incident")
def get_incidents(
    sysparm_limit: int = Query(default=50, alias="sysparm_limit"),
    sysparm_offset: int = Query(default=0, alias="sysparm_offset")
):
    results = servicenow_mock.list_incidents(limit=sysparm_limit, offset=sysparm_offset)
    return {"result": results}

@mock_app.get("/api/now/table/incident/{sys_id}")
def get_incident(sys_id: str):
    inc = servicenow_mock.get_incident(sys_id)
    if not inc:
        raise HTTPException(status_code=404, detail="ServiceNow record not found")
    return {"result": inc}

@mock_app.post("/api/now/table/incident", status_code=201)
def create_incident(payload: Dict[str, Any]):
    record = servicenow_mock.create_incident(payload)
    return {"result": record}

@mock_app.patch("/api/now/table/incident/{sys_id}")
def update_incident(sys_id: str, payload: Dict[str, Any]):
    record = servicenow_mock.update_incident(sys_id, payload)
    if not record:
        raise HTTPException(status_code=404, detail="ServiceNow record not found")
    return {"result": record}

@mock_app.delete("/api/now/table/incident/{sys_id}")
def delete_incident(sys_id: str):
    success = servicenow_mock.delete_incident(sys_id)
    if not success:
        raise HTTPException(status_code=404, detail="ServiceNow record not found")
    return {"result": {"status": "success", "deleted_sys_id": sys_id}}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("mock_servicenow.server:mock_app", host="127.0.0.1", port=8001, reload=True)
