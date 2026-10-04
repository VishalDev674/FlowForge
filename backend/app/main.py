"""FlowForge FastAPI main application."""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import auth_router, workflow_router, application_router, run_router, notif_router
from app.engine import manager
from app import models  # ensure all models are registered


def seed_default_users():
    """Auto-seed default admin and demo user for instant login."""
    from app.database import SessionLocal
    from app.auth import hash_password
    db = SessionLocal()
    try:
        admin_user = db.query(models.User).filter(models.User.email == "admin@flowforge.dev").first()
        if not admin_user:
            admin_user = models.User(
                id=str(uuid.uuid4()),
                name="Admin User",
                email="admin@flowforge.dev",
                password_hash=hash_password("admin123"),
                role=models.UserRole.admin,
            )
            db.add(admin_user)

        portal_user = db.query(models.User).filter(models.User.email == "user@flowforge.dev").first()
        if not portal_user:
            portal_user = models.User(
                id=str(uuid.uuid4()),
                name="Portal Applicant",
                email="user@flowforge.dev",
                password_hash=hash_password("user123"),
                role=models.UserRole.applicant,
            )
            db.add(portal_user)
        db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    Base.metadata.create_all(bind=engine)
    seed_default_users()
    yield


app = FastAPI(
    title="FlowForge API",
    description="Visual Workflow Automation Platform — ALGOTHON'26",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(workflow_router)
app.include_router(application_router)
app.include_router(run_router)
app.include_router(notif_router)


# WebSocket for live execution updates
@app.websocket("/ws/runs/{run_id}")
async def websocket_run(websocket: WebSocket, run_id: str):
    await manager.connect(run_id, websocket)
    try:
        while True:
            # Keep connection alive (client can send ping)
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(run_id, websocket)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "FlowForge API", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
