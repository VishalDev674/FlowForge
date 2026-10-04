# FlowForge ⚡

> **Visual Workflow Automation Platform** — Build, test, and orchestrate complex business workflows and approval pipelines with real-time visual execution.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

---

## 🌟 Highlights

- 🎨 **Visual Canvas Editor** — Interactive drag-and-drop builder for designing multi-step automated workflows with custom nodes, inputs, and outputs.
- ⚡ **Real-Time Live Execution** — Watch workflow execution progress live on canvas with WebSocket-powered node state streaming and live step logs.
- 🔀 **Dynamic Logic & Branching** — Condition evaluation, multi-branch routing, safe expression parser, and data transformation between nodes.
- 👤 **Human-in-the-Loop Approvals** — Built-in review gates, supervisor approvals, notifications, and application status transitions.
- 🌐 **Public Application Portal** — Form submission interface allowing users to submit applications directly into active automated workflows.
- 📊 **Run Analytics & Audit Trails** — Comprehensive execution history, node run logs, execution durations, payload inspection, and error debugging.

---

## 🏗️ Architecture

```
FlowForge/
├── backend/                  # FastAPI REST & WebSocket Backend
│   ├── app/
│   │   ├── main.py           # Application entrypoint & WebSocket handlers
│   │   ├── engine.py         # DAG traversal & workflow execution engine
│   │   ├── models.py         # SQLAlchemy ORM models (Workflow, Run, NodeRun, etc.)
│   │   ├── routers.py        # API routes (Auth, Workflows, Runs, Applications)
│   │   ├── schemas.py        # Pydantic v2 validation models
│   │   ├── database.py       # Database connection & session factory
│   │   └── config.py         # App configuration & environment settings
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Sample environment variables
│
├── frontend/                 # Next.js 15 App Router Frontend
│   ├── src/
│   │   ├── app/              # Next.js routes (Dashboard, Editor, Runs, Applications)
│   │   ├── components/       # UI components & workflow canvas
│   │   │   ├── editor/       # Workflow canvas, node palette, property panel
│   │   │   └── nodes/        # Flow node components & visual states
│   │   └── lib/              # API client and global state management
│   ├── package.json          # Node dependencies and scripts
│   └── tsconfig.json         # TypeScript configuration
│
├── start.bat                 # One-click Windows runner for full stack
└── README.md
```

---

## 🚀 Quick Start

### Option 1: One-Click Launch (Windows)

Double click `start.bat` or run:

```bat
start.bat
```

This starts the FastAPI backend on `http://localhost:8000` and the Next.js frontend on `http://localhost:3000`.

---

### Option 2: Manual Setup

#### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env
copy .env.example .env

# Run FastAPI backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend API will be running at `http://localhost:8000`  
Interactive Swagger Docs: `http://localhost:8000/docs`

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`.

---

## 🧩 Supported Node Types

| Node Type | Category | Description |
|:---|:---|:---|
| **Trigger** | Triggers | Initiates workflow (Form submission, webhook, manual) |
| **Field Validation** | Validation | Validates applicant fields, data schemas, rules |
| **Condition Branch** | Logic | Evaluates boolean logic (`==`, `!=`, `>`, `<`, regex) |
| **Approval Gate** | Human Task | Pauses execution awaiting human review / sign-off |
| **Notification** | Actions | Sends emails, SMS notifications, or in-app alerts |
| **API Request** | Integration | Dispatches external REST API calls / webhooks |
| **Transform** | Data | Manipulates payload data and templates variables |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide React
- **Backend**: FastAPI, Python 3.10+, SQLAlchemy, Pydantic v2, WebSockets
- **Database**: SQLite (default for development) / PostgreSQL ready
- **Authentication**: JWT (JSON Web Tokens) with passlib & python-jose

---

## 📜 License

This project is licensed under the MIT License.
