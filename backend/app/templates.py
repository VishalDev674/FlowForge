"""Workflow template definitions."""
from typing import Dict

ADMISSION_TEMPLATE = {
    "nodes": [
        {
            "id": "trigger-1",
            "type": "trigger_form",
            "position": {"x": 400, "y": 50},
            "data": {
                "label": "Application Submitted",
                "description": "Triggered when a new application is submitted",
                "config": {},
                "category": "trigger"
            }
        },
        {
            "id": "validate-1",
            "type": "validate_fields",
            "position": {"x": 400, "y": 180},
            "data": {
                "label": "Validate Required Fields",
                "description": "Checks that all required fields are present",
                "config": {
                    "required_fields": ["applicant_name", "email", "program", "percentage"]
                },
                "category": "validation"
            }
        },
        {
            "id": "docs-1",
            "type": "check_documents",
            "position": {"x": 400, "y": 310},
            "data": {
                "label": "Check Required Documents",
                "description": "Verifies required documents are attached",
                "config": {
                    "required_documents": ["marksheet", "identity_proof", "photo"]
                },
                "category": "validation"
            }
        },
        {
            "id": "condition-1",
            "type": "condition_ifelse",
            "position": {"x": 400, "y": 440},
            "data": {
                "label": "Is Application Complete?",
                "description": "Routes to correction or approval path",
                "config": {
                    "expression": "documents_check.is_complete == true"
                },
                "category": "condition"
            }
        },
        {
            "id": "status-correction",
            "type": "action_status",
            "position": {"x": 160, "y": 570},
            "data": {
                "label": "Set Status: Needs Correction",
                "description": "Marks application as needing correction",
                "config": {"status": "needs_correction"},
                "category": "action"
            }
        },
        {
            "id": "notify-correction",
            "type": "action_notify",
            "position": {"x": 160, "y": 700},
            "data": {
                "label": "Send Correction Request",
                "description": "Notifies applicant of missing documents",
                "config": {
                    "subject": "Action Required: Missing Documents for Your Application",
                    "template": "Hello {{application.applicant_name}},\n\nYour application requires attention.\nMissing documents: {{documents_check.missing_documents}}\n\nPlease resubmit the missing items.\n\nBest regards,\nFlowForge Team",
                    "recipient_field": "application.email"
                },
                "category": "action"
            }
        },
        {
            "id": "score-1",
            "type": "transform_score",
            "position": {"x": 640, "y": 570},
            "data": {
                "label": "Calculate Eligibility Score",
                "description": "Calculates applicant eligibility score",
                "config": {"threshold": 70},
                "category": "transform"
            }
        },
        {
            "id": "categorize-1",
            "type": "ai_categorize",
            "position": {"x": 640, "y": 700},
            "data": {
                "label": "Categorize Applicant",
                "description": "AI-based priority categorization",
                "config": {},
                "category": "ai"
            }
        },
        {
            "id": "assign-1",
            "type": "action_assign",
            "position": {"x": 640, "y": 830},
            "data": {
                "label": "Assign Reviewer",
                "description": "Assigns application to appropriate reviewer",
                "config": {},
                "category": "action"
            }
        },
        {
            "id": "status-review",
            "type": "action_status",
            "position": {"x": 640, "y": 960},
            "data": {
                "label": "Set Status: Under Review",
                "description": "Marks application as under review",
                "config": {"status": "under_review"},
                "category": "action"
            }
        },
        {
            "id": "notify-confirm",
            "type": "action_notify",
            "position": {"x": 640, "y": 1090},
            "data": {
                "label": "Send Confirmation",
                "description": "Notifies applicant of successful submission",
                "config": {
                    "subject": "Application Received — Under Review",
                    "template": "Hello {{application.applicant_name}},\n\nYour application has been received and is now under review.\nEligibility Score: {{eligibility.score}}\nCategory: {{categorization.category}}\nAssigned Reviewer: {{assignment.reviewer_id}}\n\nWe will contact you shortly.\n\nBest regards,\nFlowForge Team",
                    "recipient_field": "application.email"
                },
                "category": "action"
            }
        }
    ],
    "edges": [
        {"id": "e1", "source": "trigger-1", "target": "validate-1", "sourceHandle": None},
        {"id": "e2", "source": "validate-1", "target": "docs-1", "sourceHandle": None},
        {"id": "e3", "source": "docs-1", "target": "condition-1", "sourceHandle": None},
        {"id": "e4", "source": "condition-1", "target": "status-correction", "sourceHandle": "false"},
        {"id": "e5", "source": "condition-1", "target": "score-1", "sourceHandle": "true"},
        {"id": "e6", "source": "status-correction", "target": "notify-correction", "sourceHandle": None},
        {"id": "e7", "source": "score-1", "target": "categorize-1", "sourceHandle": None},
        {"id": "e8", "source": "categorize-1", "target": "assign-1", "sourceHandle": None},
        {"id": "e9", "source": "assign-1", "target": "status-review", "sourceHandle": None},
        {"id": "e10", "source": "status-review", "target": "notify-confirm", "sourceHandle": None}
    ]
}

SCHOLARSHIP_TEMPLATE = {
    "nodes": [
        {"id": "t1", "type": "trigger_form", "position": {"x": 400, "y": 50},
         "data": {"label": "Scholarship Application Submitted", "config": {}, "category": "trigger"}},
        {"id": "v1", "type": "validate_fields", "position": {"x": 400, "y": 180},
         "data": {"label": "Validate Fields", "config": {"required_fields": ["applicant_name", "email", "percentage", "income_proof"]}, "category": "validation"}},
        {"id": "s1", "type": "transform_score", "position": {"x": 400, "y": 310},
         "data": {"label": "Calculate Merit Score", "config": {"threshold": 75}, "category": "transform"}},
        {"id": "c1", "type": "condition_ifelse", "position": {"x": 400, "y": 440},
         "data": {"label": "Is Merit Score Sufficient?", "config": {"expression": "eligibility.eligible == true"}, "category": "condition"}},
        {"id": "a1", "type": "action_status", "position": {"x": 200, "y": 570},
         "data": {"label": "Mark Ineligible", "config": {"status": "rejected"}, "category": "action"}},
        {"id": "a2", "type": "action_assign", "position": {"x": 600, "y": 570},
         "data": {"label": "Assign to Scholarship Committee", "config": {}, "category": "action"}},
        {"id": "n1", "type": "action_notify", "position": {"x": 400, "y": 700},
         "data": {"label": "Notify Applicant", "config": {"subject": "Scholarship Application Update", "template": "Dear {{application.applicant_name}}, your scholarship application status has been updated.", "recipient_field": "application.email"}, "category": "action"}}
    ],
    "edges": [
        {"id": "e1", "source": "t1", "target": "v1"},
        {"id": "e2", "source": "v1", "target": "s1"},
        {"id": "e3", "source": "s1", "target": "c1"},
        {"id": "e4", "source": "c1", "target": "a1", "sourceHandle": "false"},
        {"id": "e5", "source": "c1", "target": "a2", "sourceHandle": "true"},
        {"id": "e6", "source": "a2", "target": "n1"},
    ]
}

TEMPLATES: Dict[str, dict] = {
    "admission": {
        "name": "Admission Application Processing",
        "description": "Full admission workflow: validate fields, check documents, score eligibility, assign reviewer, notify applicant",
        "category": "Education",
        "graph": ADMISSION_TEMPLATE
    },
    "scholarship": {
        "name": "Scholarship Application Validation",
        "description": "Scholarship merit evaluation and committee assignment workflow",
        "category": "Education",
        "graph": SCHOLARSHIP_TEMPLATE
    }
}
