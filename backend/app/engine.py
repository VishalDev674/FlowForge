"""
FlowForge Workflow Execution Engine
Traverses the workflow graph and executes each node handler.
"""
import uuid
import asyncio
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
from sqlalchemy.orm import Session
from app import models
from app.models import NodeRunStatus, RunStatus, ApplicationStatus


# ── WebSocket Manager ─────────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List] = {}

    async def connect(self, run_id: str, websocket):
        await websocket.accept()
        if run_id not in self.active_connections:
            self.active_connections[run_id] = []
        self.active_connections[run_id].append(websocket)

    def disconnect(self, run_id: str, websocket):
        if run_id in self.active_connections:
            try:
                self.active_connections[run_id].remove(websocket)
            except ValueError:
                pass

    async def broadcast(self, run_id: str, data: dict):
        if run_id in self.active_connections:
            disconnected = []
            for ws in self.active_connections[run_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    disconnected.append(ws)
            for ws in disconnected:
                self.disconnect(run_id, ws)


manager = ConnectionManager()


# ── Safe Expression Evaluator ─────────────────────────────────────────────────
def safe_eval(expr: str, context: dict) -> bool:
    """Evaluate a boolean expression safely without using eval()."""
    expr = expr.strip()

    def get_val(path: str, ctx: dict):
        parts = path.strip().split(".")
        val = ctx
        for p in parts:
            if isinstance(val, dict):
                val = val.get(p)
            else:
                return None
        return val

    # Handle simple comparisons: a.b.c == value / != / > / < / >= / <=
    for op in ["==", "!=", ">=", "<=", ">", "<"]:
        if op in expr:
            left, right = expr.split(op, 1)
            left = left.strip()
            right = right.strip()
            lval = get_val(left, context)
            # Parse right side
            if right.lower() == "true":
                rval = True
            elif right.lower() == "false":
                rval = False
            elif right.startswith('"') or right.startswith("'"):
                rval = right.strip('"\'')
            else:
                try:
                    rval = float(right)
                except ValueError:
                    rval = right
            if op == "==":
                return lval == rval
            elif op == "!=":
                return lval != rval
            elif op == ">":
                try:
                    return float(lval) > float(rval)
                except (TypeError, ValueError):
                    return False
            elif op == "<":
                try:
                    return float(lval) < float(rval)
                except (TypeError, ValueError):
                    return False
            elif op == ">=":
                try:
                    return float(lval) >= float(rval)
                except (TypeError, ValueError):
                    return False
            elif op == "<=":
                try:
                    return float(lval) <= float(rval)
                except (TypeError, ValueError):
                    return False

    # Handle boolean path: context.validation.is_valid
    val = get_val(expr, context)
    return bool(val)


# ── Template Renderer ──────────────────────────────────────────────────────────
def render_template(template: str, context: dict) -> str:
    """Replace {{path.to.value}} placeholders in a string."""
    def replacer(match):
        path = match.group(1).strip()
        parts = path.split(".")
        val = context
        for p in parts:
            if isinstance(val, dict):
                val = val.get(p, "")
            else:
                val = ""
        return str(val) if val is not None else ""

    return re.sub(r"\{\{([^}]+)\}\}", replacer, template)


# ── Node Handlers ──────────────────────────────────────────────────────────────
async def handle_trigger(node: dict, context: dict, config: dict) -> dict:
    return {"triggered": True, "trigger_type": node.get("type", "manual"), **context}


async def handle_validate_fields(node: dict, context: dict, config: dict) -> dict:
    required = config.get("required_fields", ["applicant_name", "email", "program", "percentage"])
    app = context.get("application", {})
    missing = []
    invalid = []
    for field in required:
        parts = field.split(".")
        val = app
        for p in parts:
            if isinstance(val, dict):
                val = val.get(p)
            else:
                val = None
        if val is None or val == "" or val is False:
            missing.append(field)
    is_valid = len(missing) == 0
    return {"is_valid": is_valid, "missing_fields": missing, "invalid_fields": invalid}


async def handle_check_documents(node: dict, context: dict, config: dict) -> dict:
    required = config.get("required_documents", ["marksheet", "identity_proof", "photo"])
    docs = context.get("application", {}).get("documents_json", {})
    missing = [d for d in required if not docs.get(d)]
    return {"is_complete": len(missing) == 0, "missing_documents": missing}


async def handle_ifelse(node: dict, context: dict, config: dict) -> dict:
    expr = config.get("expression", "true")
    result = safe_eval(expr, context)
    return {"condition_result": result, "branch": "true" if result else "false"}


async def handle_switch(node: dict, context: dict, config: dict) -> dict:
    field = config.get("field", "")
    cases = config.get("cases", {})
    parts = field.split(".")
    val = context
    for p in parts:
        val = val.get(p, "") if isinstance(val, dict) else ""
    matched = str(val) if val else "default"
    route = cases.get(matched, cases.get("default", matched))
    return {"switch_value": val, "route": route}


async def handle_map_fields(node: dict, context: dict, config: dict) -> dict:
    mapping = config.get("mapping", {})
    result = {}
    app = context.get("application", {})
    for target, source in mapping.items():
        parts = source.split(".")
        val = app
        for p in parts:
            val = val.get(p, None) if isinstance(val, dict) else None
        result[target] = val
    return {"mapped": result}


async def handle_calculate_score(node: dict, context: dict, config: dict) -> dict:
    app = context.get("application", {})
    threshold = float(config.get("threshold", 70))
    try:
        pct = float(app.get("percentage", 0))
    except (TypeError, ValueError):
        pct = 0.0
    category_bonus = {"SC": 5, "ST": 5, "OBC": 2.5}.get(app.get("category_code", ""), 0)
    score = round(pct + category_bonus, 2)
    eligible = score >= threshold
    reason = (f"Score {score} is {'above' if eligible else 'below'} the {threshold}% eligibility threshold")
    return {"score": score, "eligible": eligible, "reason": reason}


async def handle_categorize(node: dict, context: dict, config: dict) -> dict:
    score = context.get("eligibility", {}).get("score", 0)
    try:
        score = float(score)
    except (TypeError, ValueError):
        score = 0.0
    if score >= 90:
        cat, priority = "Merit", "High Priority"
    elif score >= 75:
        cat, priority = "General", "Medium Priority"
    else:
        cat, priority = "Standard", "Low Priority"
    return {"category": cat, "priority": priority, "ai_confidence": 0.92}


async def handle_update_status(node: dict, context: dict, config: dict, db: Session = None, app_id: str = None) -> dict:
    new_status = config.get("status", "under_review")
    if db and app_id:
        app = db.query(models.Application).filter(models.Application.id == app_id).first()
        if app:
            try:
                app.status = ApplicationStatus(new_status)
            except ValueError:
                pass
            db.commit()
    return {"status_updated": True, "new_status": new_status}


async def handle_assign_reviewer(node: dict, context: dict, config: dict, db: Session = None, app_id: str = None) -> dict:
    program = context.get("application", {}).get("program", "general")
    queues = {
        "computer_science": ("reviewer_01", "cs_admissions"),
        "engineering": ("reviewer_02", "eng_admissions"),
        "business": ("reviewer_03", "biz_admissions"),
    }
    reviewer_id, queue = queues.get(
        str(program).lower().replace(" ", "_"),
        ("reviewer_04", "general_admissions")
    )
    if db and app_id:
        app = db.query(models.Application).filter(models.Application.id == app_id).first()
        if app:
            app.assigned_reviewer_id = reviewer_id
            db.commit()
    return {"reviewer_id": reviewer_id, "queue": queue, "assigned": True}


async def handle_send_notification(node: dict, context: dict, config: dict, db: Session = None, app_id: str = None, run_id: str = None) -> dict:
    template = config.get("template", "Hello {{applicant_name}}, your application has been processed.")
    recipient = config.get("recipient_field", "email")
    # resolve recipient
    parts = recipient.split(".")
    val = context
    for p in parts:
        val = val.get(p, "") if isinstance(val, dict) else ""
    email = val or context.get("application", {}).get("email", "unknown@example.com")
    message = render_template(template, context)
    subject = render_template(config.get("subject", "FlowForge: Application Update"), context)

    # Simulate failure if configured
    if config.get("simulate_failure", False):
        raise Exception("Email provider timeout: Connection refused (simulated)")

    if db and app_id:
        notif = models.Notification(
            id=str(uuid.uuid4()),
            application_id=app_id,
            workflow_run_id=run_id,
            recipient=email,
            channel="email",
            subject=subject,
            message=message,
            status="delivered",
        )
        db.add(notif)
        db.commit()
    return {"delivered": True, "recipient": email, "subject": subject, "message": message}


async def handle_http_request(node: dict, context: dict, config: dict) -> dict:
    import httpx
    url = render_template(config.get("url", ""), context)
    method = config.get("method", "GET").upper()
    headers = config.get("headers", {})
    body = config.get("body", None)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.request(method, url, headers=headers, json=body)
            return {"status_code": resp.status_code, "response": resp.text[:500]}
    except Exception as e:
        raise Exception(f"HTTP request failed: {str(e)}")


async def handle_delay(node: dict, context: dict, config: dict) -> dict:
    seconds = int(config.get("seconds", 1))
    await asyncio.sleep(min(seconds, 5))  # Cap at 5s for demo
    return {"delayed_seconds": seconds}


async def handle_log_message(node: dict, context: dict, config: dict) -> dict:
    msg = render_template(config.get("message", "Log entry"), context)
    return {"log": msg, "timestamp": datetime.utcnow().isoformat()}


# ── Main Execution Engine ──────────────────────────────────────────────────────
NODE_HANDLERS = {
    "trigger_manual": handle_trigger,
    "trigger_form": handle_trigger,
    "trigger_webhook": handle_trigger,
    "validate_fields": handle_validate_fields,
    "check_documents": handle_check_documents,
    "condition_ifelse": handle_ifelse,
    "condition_switch": handle_switch,
    "transform_map": handle_map_fields,
    "transform_score": handle_calculate_score,
    "ai_categorize": handle_categorize,
    "action_status": handle_update_status,
    "action_assign": handle_assign_reviewer,
    "action_notify": handle_send_notification,
    "action_http": handle_http_request,
    "utility_delay": handle_delay,
    "utility_log": handle_log_message,
}

# Nodes that need db + app_id
DB_NODES = {"action_status", "action_assign", "action_notify"}


def build_adjacency(graph: dict) -> Dict[str, List[str]]:
    """Build adjacency list from React Flow graph JSON."""
    adj: Dict[str, List[str]] = {}
    node_map = {n["id"]: n for n in graph.get("nodes", [])}
    for node in graph.get("nodes", []):
        adj[node["id"]] = []

    for edge in graph.get("edges", []):
        src = edge["source"]
        tgt = edge["target"]
        # For condition nodes, track which handle (true/false)
        source_handle = edge.get("sourceHandle", "")
        adj.setdefault(src, []).append((tgt, source_handle))

    # Normalize to list of (target, handle) tuples
    return adj, node_map


def topological_sort(nodes: list, adj: dict) -> list:
    """Return nodes in execution order via topological sort (BFS Kahn's)."""
    in_degree = {n["id"]: 0 for n in nodes}
    for src, edges in adj.items():
        for item in edges:
            tgt = item[0] if isinstance(item, tuple) else item
            in_degree[tgt] = in_degree.get(tgt, 0) + 1

    queue = [n for n in nodes if in_degree[n["id"]] == 0]
    result = []
    while queue:
        node = queue.pop(0)
        result.append(node)
        for item in adj.get(node["id"], []):
            tgt_id = item[0] if isinstance(item, tuple) else item
            in_degree[tgt_id] -= 1
            if in_degree[tgt_id] == 0:
                tgt_node = next((n for n in nodes if n["id"] == tgt_id), None)
                if tgt_node:
                    queue.append(tgt_node)
    return result


async def execute_workflow(
    run_id: str,
    workflow: models.Workflow,
    graph: dict,
    context: dict,
    db: Session,
    application_id: Optional[str] = None,
):
    """Execute a workflow graph, updating node statuses and broadcasting via WebSocket."""
    from app.database import SessionLocal

    # Use a fresh db session in background tasks
    local_db = SessionLocal()

    async def update_run_status(status: str, summary: str = None):
        run = local_db.query(models.WorkflowRun).filter(models.WorkflowRun.id == run_id).first()
        if run:
            run.status = models.RunStatus(status)
            if summary:
                run.summary = summary
            if status in ("completed", "failed", "partially_failed"):
                run.finished_at = datetime.utcnow()
            local_db.commit()
        await manager.broadcast(run_id, {"type": "run_status", "run_id": run_id, "status": status, "summary": summary})

    async def update_node_status(node_run_id: str, node_id: str, status: str,
                                  output: dict = None, error: str = None):
        nr = local_db.query(models.NodeRun).filter(models.NodeRun.id == node_run_id).first()
        if nr:
            nr.status = models.NodeRunStatus(status)
            if output:
                nr.output_json = output
            if error:
                nr.error_message = error
            if status == "running":
                nr.started_at = datetime.utcnow()
            elif status in ("succeeded", "failed", "skipped"):
                nr.finished_at = datetime.utcnow()
            local_db.commit()
        await manager.broadcast(run_id, {
            "type": "node_status",
            "run_id": run_id,
            "node_run_id": node_run_id,
            "node_id": node_id,
            "status": status,
            "output": output,
            "error": error,
        })

    try:
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])

        # Build adjacency
        adj: Dict[str, List] = {n["id"]: [] for n in nodes}
        for edge in edges:
            adj.setdefault(edge["source"], []).append((edge["target"], edge.get("sourceHandle", "")))

        node_map = {n["id"]: n for n in nodes}

        # Find trigger node (starting point)
        trigger_node = next(
            (n for n in nodes if n.get("type", "").startswith("trigger")), nodes[0] if nodes else None
        )
        if not trigger_node:
            await update_run_status("failed", "No trigger node found")
            local_db.close()
            return

        await update_run_status("running")

        # BFS execution respecting conditions
        visited: Set[str] = set()
        queue = [trigger_node["id"]]
        has_failure = False

        # Pre-create node run records
        node_run_map: Dict[str, str] = {}
        for node in nodes:
            nr = models.NodeRun(
                id=str(uuid.uuid4()),
                workflow_run_id=run_id,
                node_id=node["id"],
                node_type=node.get("type", "unknown"),
                node_label=node.get("data", {}).get("label", node.get("type", "")),
                status=models.NodeRunStatus.pending,
                input_json={},
                output_json={},
            )
            local_db.add(nr)
            node_run_map[node["id"]] = nr.id
        local_db.commit()

        # Broadcast initial pending state for all nodes
        for node in nodes:
            await manager.broadcast(run_id, {
                "type": "node_status",
                "run_id": run_id,
                "node_run_id": node_run_map[node["id"]],
                "node_id": node["id"],
                "status": "pending",
            })

        # BFS with condition-aware routing
        while queue:
            node_id = queue.pop(0)
            if node_id in visited:
                continue
            visited.add(node_id)

            node = node_map.get(node_id)
            if not node:
                continue

            node_type = node.get("type", "")
            config = node.get("data", {}).get("config", {})
            node_run_id = node_run_map.get(node_id)

            # Update input context snapshot
            nr = local_db.query(models.NodeRun).filter(models.NodeRun.id == node_run_id).first()
            if nr:
                nr.input_json = {k: v for k, v in context.items() if k != "application" or True}
            local_db.commit()

            await update_node_status(node_run_id, node_id, "running")
            await asyncio.sleep(0.5)  # Simulate processing time

            handler = NODE_HANDLERS.get(node_type)
            output = {}
            error = None
            success = True

            try:
                if handler:
                    if node_type in DB_NODES:
                        output = await handler(node, context, config, db=local_db, app_id=application_id, run_id=run_id)
                    else:
                        output = await handler(node, context, config)
                else:
                    output = {"executed": True, "node_type": node_type}
            except Exception as e:
                error = str(e)
                success = False
                has_failure = True

            # Store output in context by semantic key
            ctx_key_map = {
                "validate_fields": "validation",
                "check_documents": "documents_check",
                "condition_ifelse": "condition",
                "condition_switch": "condition",
                "transform_score": "eligibility",
                "ai_categorize": "categorization",
                "action_assign": "assignment",
                "action_notify": "notification",
            }
            ctx_key = ctx_key_map.get(node_type, node_type.replace("_", "_"))
            if ctx_key and output:
                context[ctx_key] = output

            status = "succeeded" if success else "failed"
            await update_node_status(node_run_id, node_id, status, output, error)

            if not success:
                # Non-critical failure — continue other branches
                continue

            # Determine next nodes
            next_edges = adj.get(node_id, [])
            condition_result = output.get("condition_result", None)
            branch = output.get("branch", None)

            for tgt_id, handle in next_edges:
                if tgt_id in visited:
                    continue
                # Condition routing
                if condition_result is not None and branch is not None:
                    if handle in ("true", "false"):
                        if handle != branch:
                            # Skip wrong branch nodes
                            nr2 = local_db.query(models.NodeRun).filter(models.NodeRun.id == node_run_map.get(tgt_id, "")).first()
                            if nr2:
                                nr2.status = models.NodeRunStatus.skipped
                                nr2.finished_at = datetime.utcnow()
                                local_db.commit()
                            await manager.broadcast(run_id, {
                                "type": "node_status",
                                "run_id": run_id,
                                "node_run_id": node_run_map.get(tgt_id),
                                "node_id": tgt_id,
                                "status": "skipped",
                            })
                            visited.add(tgt_id)
                            continue
                queue.append(tgt_id)

        # Mark remaining unvisited nodes as skipped
        for node in nodes:
            if node["id"] not in visited:
                nr = local_db.query(models.NodeRun).filter(
                    models.NodeRun.id == node_run_map.get(node["id"], "")
                ).first()
                if nr and nr.status == models.NodeRunStatus.pending:
                    nr.status = models.NodeRunStatus.skipped
                    nr.finished_at = datetime.utcnow()
                    local_db.commit()
                await manager.broadcast(run_id, {
                    "type": "node_status",
                    "run_id": run_id,
                    "node_run_id": node_run_map.get(node["id"]),
                    "node_id": node["id"],
                    "status": "skipped",
                })

        final_status = "partially_failed" if has_failure else "completed"
        summary = _generate_summary(context, has_failure, application_id)
        await update_run_status(final_status, summary)

    except Exception as e:
        run = local_db.query(models.WorkflowRun).filter(models.WorkflowRun.id == run_id).first()
        if run:
            run.status = models.RunStatus.failed
            run.summary = f"Execution error: {str(e)}"
            run.finished_at = datetime.utcnow()
            local_db.commit()
        await manager.broadcast(run_id, {"type": "run_status", "run_id": run_id, "status": "failed", "error": str(e)})
    finally:
        local_db.close()


def _generate_summary(context: dict, has_failure: bool, app_id: str) -> str:
    """Generate a plain-language execution summary."""
    app = context.get("application", {})
    name = app.get("applicant_name", "The applicant")
    aid = app_id or app.get("id", "")

    validation = context.get("validation", {})
    docs = context.get("documents_check", {})
    eligibility = context.get("eligibility", {})
    assignment = context.get("assignment", {})
    condition = context.get("condition", {})

    parts = []
    if aid:
        parts.append(f"Application {aid}")

    if not validation.get("is_valid", True):
        missing = ", ".join(validation.get("missing_fields", []))
        parts.append(f"failed field validation (missing: {missing})")
    elif not docs.get("is_complete", True):
        missing = ", ".join(docs.get("missing_documents", []))
        parts.append(f"was routed to Needs Correction because required documents were missing: {missing}")
        parts.append(f"A correction notification was generated for {app.get('email', '')}")
    else:
        score = eligibility.get("score")
        if score:
            parts.append(f"passed all validations with an eligibility score of {score}")
        reviewer = assignment.get("reviewer_id")
        if reviewer:
            parts.append(f"was assigned to {reviewer}")
        parts.append("and moved to Under Review")

    if has_failure:
        parts.append("(some nodes encountered errors)")

    return ". ".join(parts) + "." if parts else "Workflow completed."


# ── Graph Validator ────────────────────────────────────────────────────────────
def validate_graph(graph: dict) -> List[str]:
    """Return list of validation errors. Empty list means valid."""
    errors = []
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    if not nodes:
        errors.append("Workflow has no nodes")
        return errors

    node_ids = {n["id"] for n in nodes}
    trigger_nodes = [n for n in nodes if n.get("type", "").startswith("trigger")]

    if len(trigger_nodes) == 0:
        errors.append("Workflow must have at least one trigger node")
    elif len(trigger_nodes) > 1:
        errors.append("Workflow can have at most one trigger node")

    # Check edges reference valid nodes
    for edge in edges:
        if edge["source"] not in node_ids:
            errors.append(f"Edge references unknown source node: {edge['source']}")
        if edge["target"] not in node_ids:
            errors.append(f"Edge references unknown target node: {edge['target']}")

    # Check condition nodes have both outputs
    condition_nodes = [n for n in nodes if n.get("type", "").startswith("condition")]
    for cn in condition_nodes:
        cn_edges = [e for e in edges if e["source"] == cn["id"]]
        handles = {e.get("sourceHandle", "") for e in cn_edges}
        if "true" not in handles:
            errors.append(f"Condition node '{cn.get('data', {}).get('label', cn['id'])}' is missing a True output connection")
        if "false" not in handles:
            errors.append(f"Condition node '{cn.get('data', {}).get('label', cn['id'])}' is missing a False output connection")

    # Detect cycles
    if _has_cycle(nodes, edges):
        errors.append("Workflow contains a cycle, which is not allowed")

    # Check disconnected nodes (excluding trigger)
    connected = set()
    for edge in edges:
        connected.add(edge["source"])
        connected.add(edge["target"])
    for node in nodes:
        if not node.get("type", "").startswith("trigger") and node["id"] not in connected:
            label = node.get("data", {}).get("label", node["id"])
            errors.append(f"Node '{label}' is disconnected from the workflow")

    return errors


def _has_cycle(nodes: list, edges: list) -> bool:
    adj = {n["id"]: [] for n in nodes}
    for edge in edges:
        adj.setdefault(edge["source"], []).append(edge["target"])

    WHITE, GRAY, BLACK = 0, 1, 2
    color = {n["id"]: WHITE for n in nodes}

    def dfs(u):
        color[u] = GRAY
        for v in adj.get(u, []):
            if color.get(v) == GRAY:
                return True
            if color.get(v) == WHITE and dfs(v):
                return True
        color[u] = BLACK
        return False

    return any(dfs(n["id"]) for n in nodes if color[n["id"]] == WHITE)
