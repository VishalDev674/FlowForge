"""FastAPI routers for FlowForge."""
import uuid
import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.auth import hash_password, verify_password, create_access_token, get_current_user, require_user
from app.engine import execute_workflow, validate_graph, manager
from app.templates import TEMPLATES

# ── Auth Router ───────────────────────────────────────────────────────────────
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


@auth_router.post("/register", response_model=schemas.TokenResponse)
def register(body: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        id=str(uuid.uuid4()),
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=models.UserRole(body.role) if body.role in [r.value for r in models.UserRole] else models.UserRole.admin
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.id})
    return schemas.TokenResponse(access_token=token, user_id=user.id, name=user.name, email=user.email, role=user.role.value)


@auth_router.post("/login", response_model=schemas.TokenResponse)
def login(body: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.id})
    return schemas.TokenResponse(access_token=token, user_id=user.id, name=user.name, email=user.email, role=user.role.value)


@auth_router.get("/me")
def me(current_user: models.User = Depends(require_user)):
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email, "role": current_user.role.value}


# ── Workflow Router ───────────────────────────────────────────────────────────
workflow_router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@workflow_router.get("", response_model=List[schemas.WorkflowOut])
def list_workflows(db: Session = Depends(get_db)):
    return db.query(models.Workflow).order_by(models.Workflow.updated_at.desc()).all()


@workflow_router.post("", response_model=schemas.WorkflowOut)
def create_workflow(body: schemas.WorkflowCreate, db: Session = Depends(get_db),
                    current_user: Optional[models.User] = Depends(get_current_user)):
    workflow = models.Workflow(
        id=str(uuid.uuid4()),
        name=body.name,
        description=body.description,
        owner_id=current_user.id if current_user else None,
        status=models.WorkflowStatus.draft,
    )
    db.add(workflow)
    db.flush()

    # Create initial version if graph provided
    if body.graph_json:
        version = models.WorkflowVersion(
            id=str(uuid.uuid4()),
            workflow_id=workflow.id,
            version_number=1,
            graph_json=body.graph_json,
        )
        db.add(version)
        db.flush()
        workflow.active_version_id = version.id

    db.commit()
    db.refresh(workflow)
    return workflow


@workflow_router.get("/templates")
def list_templates():
    return [
        {"key": k, "name": v["name"], "description": v["description"], "category": v["category"]}
        for k, v in TEMPLATES.items()
    ]


@workflow_router.post("/from-template/{template_key}", response_model=schemas.WorkflowOut)
def create_from_template(template_key: str, db: Session = Depends(get_db),
                          current_user: Optional[models.User] = Depends(get_current_user)):
    template = TEMPLATES.get(template_key)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    workflow = models.Workflow(
        id=str(uuid.uuid4()),
        name=template["name"],
        description=template["description"],
        owner_id=current_user.id if current_user else None,
        status=models.WorkflowStatus.draft,
        is_template=False,
    )
    db.add(workflow)
    db.flush()

    version = models.WorkflowVersion(
        id=str(uuid.uuid4()),
        workflow_id=workflow.id,
        version_number=1,
        graph_json=template["graph"],
    )
    db.add(version)
    db.flush()
    workflow.active_version_id = version.id
    db.commit()
    db.refresh(workflow)
    return workflow


@workflow_router.get("/{workflow_id}", response_model=schemas.WorkflowDetailOut)
def get_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@workflow_router.put("/{workflow_id}", response_model=schemas.WorkflowOut)
def update_workflow(workflow_id: str, body: schemas.WorkflowUpdate, db: Session = Depends(get_db)):
    wf = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if body.name is not None:
        wf.name = body.name
    if body.description is not None:
        wf.description = body.description
    wf.updated_at = datetime.utcnow()

    if body.graph_json is not None:
        # Create new version
        latest_ver = (db.query(models.WorkflowVersion)
                      .filter(models.WorkflowVersion.workflow_id == workflow_id)
                      .order_by(models.WorkflowVersion.version_number.desc())
                      .first())
        next_ver = (latest_ver.version_number + 1) if latest_ver else 1
        version = models.WorkflowVersion(
            id=str(uuid.uuid4()),
            workflow_id=workflow_id,
            version_number=next_ver,
            graph_json=body.graph_json,
        )
        db.add(version)
        db.flush()
        wf.active_version_id = version.id

    db.commit()
    db.refresh(wf)
    return wf


@workflow_router.post("/{workflow_id}/publish")
def publish_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    version = db.query(models.WorkflowVersion).filter(
        models.WorkflowVersion.id == wf.active_version_id
    ).first()
    if not version:
        raise HTTPException(status_code=400, detail="No graph version found. Save the workflow first.")

    errors = validate_graph(version.graph_json)
    if errors:
        raise HTTPException(status_code=422, detail={"errors": errors})

    wf.status = models.WorkflowStatus.published
    wf.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True, "message": "Workflow published successfully"}


@workflow_router.post("/{workflow_id}/pause")
def pause_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    wf.status = models.WorkflowStatus.paused
    db.commit()
    return {"success": True}


@workflow_router.delete("/{workflow_id}")
def delete_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(wf)
    db.commit()
    return {"success": True}


@workflow_router.post("/{workflow_id}/validate")
def validate_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    version = db.query(models.WorkflowVersion).filter(
        models.WorkflowVersion.id == wf.active_version_id
    ).first()
    if not version:
        return {"valid": False, "errors": ["No graph saved yet"]}
    errors = validate_graph(version.graph_json)
    return {"valid": len(errors) == 0, "errors": errors}


@workflow_router.post("/{workflow_id}/run")
def run_workflow(workflow_id: str, body: schemas.ManualRunRequest,
                 background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    wf = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    version = db.query(models.WorkflowVersion).filter(
        models.WorkflowVersion.id == wf.active_version_id
    ).first()
    if not version:
        raise HTTPException(status_code=400, detail="No graph version found")

    # Build context
    context = {"application": body.input_json or {}}
    if body.application_id:
        app = db.query(models.Application).filter(models.Application.id == body.application_id).first()
        if app:
            context["application"] = {
                "id": app.id,
                "applicant_name": app.applicant_name,
                "email": app.email,
                "phone": app.phone,
                "program": app.program,
                "percentage": app.percentage,
                "documents_json": app.documents_json or {},
                **(app.payload_json or {})
            }

    run = models.WorkflowRun(
        id=str(uuid.uuid4()),
        workflow_id=workflow_id,
        workflow_version_id=version.id,
        application_id=body.application_id,
        trigger_type="manual",
        input_json=context,
        status=models.RunStatus.queued,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    background_tasks.add_task(
        asyncio.run,
        execute_workflow(
            run_id=run.id,
            workflow=wf,
            graph=version.graph_json,
            context=context,
            db=db,
            application_id=body.application_id,
        )
    )

    return {"run_id": run.id, "status": "queued"}


@workflow_router.get("/{workflow_id}/runs", response_model=List[schemas.WorkflowRunOut])
def list_runs(workflow_id: str, db: Session = Depends(get_db)):
    return (db.query(models.WorkflowRun)
            .filter(models.WorkflowRun.workflow_id == workflow_id)
            .order_by(models.WorkflowRun.created_at.desc())
            .limit(50)
            .all())


# ── Application Router ────────────────────────────────────────────────────────
application_router = APIRouter(prefix="/api/applications", tags=["applications"])


@application_router.post("", response_model=schemas.ApplicationOut)
def submit_application(body: schemas.ApplicationCreate,
                        background_tasks: BackgroundTasks,
                        db: Session = Depends(get_db)):
    app = models.Application(
        id=f"APP-{datetime.utcnow().year}-{str(uuid.uuid4())[:4].upper()}",
        applicant_name=body.applicant_name,
        email=body.email,
        phone=body.phone,
        program=body.program,
        percentage=body.percentage,
        payload_json=body.payload_json or {},
        documents_json=body.documents_json or {},
        status=models.ApplicationStatus.received,
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    # Auto-trigger published workflow
    published_wf = (db.query(models.Workflow)
                    .filter(models.Workflow.status == models.WorkflowStatus.published)
                    .first())
    if published_wf and published_wf.active_version_id:
        version = db.query(models.WorkflowVersion).filter(
            models.WorkflowVersion.id == published_wf.active_version_id
        ).first()
        if version:
            context = {
                "application": {
                    "id": app.id,
                    "applicant_name": app.applicant_name,
                    "email": app.email,
                    "phone": app.phone,
                    "program": app.program,
                    "percentage": app.percentage,
                    "documents_json": app.documents_json or {},
                }
            }
            run = models.WorkflowRun(
                id=str(uuid.uuid4()),
                workflow_id=published_wf.id,
                workflow_version_id=version.id,
                application_id=app.id,
                trigger_type="form_submission",
                input_json=context,
                status=models.RunStatus.queued,
            )
            db.add(run)
            db.commit()
            background_tasks.add_task(
                asyncio.run,
                execute_workflow(
                    run_id=run.id,
                    workflow=published_wf,
                    graph=version.graph_json,
                    context=context,
                    db=db,
                    application_id=app.id,
                )
            )

    return app


@application_router.get("", response_model=List[schemas.ApplicationOut])
def list_applications(db: Session = Depends(get_db)):
    return db.query(models.Application).order_by(models.Application.created_at.desc()).all()


@application_router.get("/{app_id}", response_model=schemas.ApplicationOut)
def get_application(app_id: str, db: Session = Depends(get_db)):
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@application_router.patch("/{app_id}/status")
def update_status(app_id: str, body: schemas.ApplicationStatusUpdate, db: Session = Depends(get_db)):
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    try:
        app.status = models.ApplicationStatus(body.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")
    db.commit()
    return {"success": True}


@application_router.patch("/{app_id}/reviewer")
def assign_reviewer(app_id: str, body: schemas.ReviewerAssign, db: Session = Depends(get_db)):
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app.assigned_reviewer_id = body.reviewer_id
    db.commit()
    return {"success": True}


# ── Runs/Monitoring Router ────────────────────────────────────────────────────
run_router = APIRouter(prefix="/api/runs", tags=["runs"])


@run_router.get("", response_model=List[schemas.WorkflowRunOut])
def list_all_runs(db: Session = Depends(get_db)):
    return (db.query(models.WorkflowRun)
            .order_by(models.WorkflowRun.created_at.desc())
            .limit(100)
            .all())


@run_router.get("/{run_id}", response_model=schemas.WorkflowRunOut)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(models.WorkflowRun).filter(models.WorkflowRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@run_router.get("/{run_id}/logs", response_model=List[schemas.NodeRunOut])
def get_run_logs(run_id: str, db: Session = Depends(get_db)):
    return (db.query(models.NodeRun)
            .filter(models.NodeRun.workflow_run_id == run_id)
            .order_by(models.NodeRun.created_at)
            .all())


@run_router.post("/node-runs/{node_run_id}/retry")
async def retry_node(node_run_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    nr = db.query(models.NodeRun).filter(models.NodeRun.id == node_run_id).first()
    if not nr:
        raise HTTPException(status_code=404, detail="Node run not found")
    if nr.status != models.NodeRunStatus.failed:
        raise HTTPException(status_code=400, detail="Node is not in failed state")

    nr.status = models.NodeRunStatus.retrying
    nr.retry_count += 1
    db.commit()

    # Simple retry: re-execute the single node
    from app.engine import NODE_HANDLERS, DB_NODES
    run = db.query(models.WorkflowRun).filter(models.WorkflowRun.id == nr.workflow_run_id).first()
    context = run.input_json if run else {}

    async def do_retry():
        from app.database import SessionLocal
        local_db = SessionLocal()
        try:
            node_mock = {"id": nr.node_id, "type": nr.node_type, "data": {"config": {}}}
            handler = NODE_HANDLERS.get(nr.node_type)
            if handler:
                output = await handler(node_mock, context, {})
                local_nr = local_db.query(models.NodeRun).filter(models.NodeRun.id == node_run_id).first()
                if local_nr:
                    local_nr.status = models.NodeRunStatus.succeeded
                    local_nr.output_json = output
                    local_nr.finished_at = datetime.utcnow()
                    local_db.commit()
                await manager.broadcast(nr.workflow_run_id, {
                    "type": "node_status",
                    "run_id": nr.workflow_run_id,
                    "node_run_id": node_run_id,
                    "node_id": nr.node_id,
                    "status": "succeeded",
                    "output": output,
                })
        except Exception as e:
            local_nr = local_db.query(models.NodeRun).filter(models.NodeRun.id == node_run_id).first()
            if local_nr:
                local_nr.status = models.NodeRunStatus.failed
                local_nr.error_message = str(e)
                local_db.commit()
        finally:
            local_db.close()

    background_tasks.add_task(asyncio.run, do_retry())
    return {"success": True, "retry_count": nr.retry_count}


# ── Notifications Router ──────────────────────────────────────────────────────
notif_router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@notif_router.get("")
def list_notifications(db: Session = Depends(get_db)):
    return db.query(models.Notification).order_by(models.Notification.created_at.desc()).limit(50).all()
