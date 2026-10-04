from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr


# ── Auth ────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "admin"


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    name: str
    email: str
    role: str


# ── Workflow ─────────────────────────────────────────────────────────────────
class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    graph_json: Optional[Dict] = None


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    graph_json: Optional[Dict] = None


class WorkflowVersionOut(BaseModel):
    id: str
    workflow_id: str
    version_number: int
    graph_json: Dict
    created_at: datetime

    class Config:
        from_attributes = True


class WorkflowOut(BaseModel):
    id: str
    name: str
    description: str
    status: str
    owner_id: Optional[str]
    active_version_id: Optional[str]
    is_template: bool
    template_category: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowDetailOut(WorkflowOut):
    versions: List[WorkflowVersionOut] = []


# ── Application ──────────────────────────────────────────────────────────────
class ApplicationCreate(BaseModel):
    applicant_name: str
    email: str
    phone: Optional[str] = None
    program: Optional[str] = None
    percentage: Optional[str] = None
    payload_json: Optional[Dict] = {}
    documents_json: Optional[Dict] = {}


class ApplicationOut(BaseModel):
    id: str
    applicant_name: str
    email: str
    phone: Optional[str]
    program: Optional[str]
    percentage: Optional[str]
    payload_json: Optional[Dict]
    documents_json: Optional[Dict]
    status: str
    assigned_reviewer_id: Optional[str]
    eligibility_score: Optional[str]
    category: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplicationStatusUpdate(BaseModel):
    status: str


class ReviewerAssign(BaseModel):
    reviewer_id: str


# ── Workflow Runs ─────────────────────────────────────────────────────────────
class ManualRunRequest(BaseModel):
    application_id: Optional[str] = None
    input_json: Optional[Dict] = {}


class NodeRunOut(BaseModel):
    id: str
    workflow_run_id: str
    node_id: str
    node_type: str
    node_label: Optional[str]
    status: str
    input_json: Optional[Dict]
    output_json: Optional[Dict]
    error_message: Optional[str]
    retry_count: int
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class WorkflowRunOut(BaseModel):
    id: str
    workflow_id: str
    workflow_version_id: Optional[str]
    application_id: Optional[str]
    trigger_type: str
    input_json: Optional[Dict]
    status: str
    summary: Optional[str]
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    created_at: datetime
    node_runs: List[NodeRunOut] = []

    class Config:
        from_attributes = True


class RetryNodeRequest(BaseModel):
    node_run_id: str
