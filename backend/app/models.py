import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, Integer, ForeignKey,
    Boolean, Enum as SAEnum, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base


def gen_id():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    admin = "admin"
    reviewer = "reviewer"
    applicant = "applicant"


class WorkflowStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    paused = "paused"
    archived = "archived"


class RunStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"
    partially_failed = "partially_failed"
    cancelled = "cancelled"


class NodeRunStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    skipped = "skipped"
    retrying = "retrying"
    waiting = "waiting"


class ApplicationStatus(str, enum.Enum):
    received = "received"
    validating = "validating"
    needs_correction = "needs_correction"
    under_review = "under_review"
    accepted = "accepted"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.admin)
    created_at = Column(DateTime, default=datetime.utcnow)

    workflows = relationship("Workflow", back_populates="owner")


class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    status = Column(SAEnum(WorkflowStatus), default=WorkflowStatus.draft)
    owner_id = Column(String, ForeignKey("users.id"), nullable=True)
    active_version_id = Column(String, nullable=True)
    is_template = Column(Boolean, default=False)
    template_category = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="workflows")
    versions = relationship("WorkflowVersion", back_populates="workflow",
                            foreign_keys="WorkflowVersion.workflow_id")
    runs = relationship("WorkflowRun", back_populates="workflow")


class WorkflowVersion(Base):
    __tablename__ = "workflow_versions"
    id = Column(String, primary_key=True, default=gen_id)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    version_number = Column(Integer, default=1)
    graph_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    workflow = relationship("Workflow", back_populates="versions",
                            foreign_keys=[workflow_id])


class Application(Base):
    __tablename__ = "applications"
    id = Column(String, primary_key=True, default=gen_id)
    applicant_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    program = Column(String(255), nullable=True)
    percentage = Column(String(20), nullable=True)
    payload_json = Column(JSON, default={})
    documents_json = Column(JSON, default={})
    status = Column(SAEnum(ApplicationStatus), default=ApplicationStatus.received)
    assigned_reviewer_id = Column(String, nullable=True)
    eligibility_score = Column(String(20), nullable=True)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    runs = relationship("WorkflowRun", back_populates="application")
    notifications = relationship("Notification", back_populates="application")


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"
    id = Column(String, primary_key=True, default=gen_id)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    workflow_version_id = Column(String, ForeignKey("workflow_versions.id"), nullable=True)
    application_id = Column(String, ForeignKey("applications.id"), nullable=True)
    trigger_type = Column(String(100), default="manual")
    input_json = Column(JSON, default={})
    status = Column(SAEnum(RunStatus), default=RunStatus.queued)
    summary = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workflow = relationship("Workflow", back_populates="runs")
    application = relationship("Application", back_populates="runs")
    node_runs = relationship("NodeRun", back_populates="workflow_run",
                             cascade="all, delete-orphan")


class NodeRun(Base):
    __tablename__ = "node_runs"
    id = Column(String, primary_key=True, default=gen_id)
    workflow_run_id = Column(String, ForeignKey("workflow_runs.id"), nullable=False)
    node_id = Column(String(255), nullable=False)
    node_type = Column(String(100), nullable=False)
    node_label = Column(String(255), nullable=True)
    status = Column(SAEnum(NodeRunStatus), default=NodeRunStatus.pending)
    input_json = Column(JSON, default={})
    output_json = Column(JSON, default={})
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workflow_run = relationship("WorkflowRun", back_populates="node_runs")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=gen_id)
    application_id = Column(String, ForeignKey("applications.id"), nullable=True)
    workflow_run_id = Column(String, nullable=True)
    recipient = Column(String(255), nullable=False)
    channel = Column(String(50), default="email")
    subject = Column(String(500), nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String(50), default="sent")
    provider_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("Application", back_populates="notifications")
