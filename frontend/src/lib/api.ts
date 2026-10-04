const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ff_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json();
      detail = err.detail?.errors ? err.detail.errors.join(', ') : (err.detail || detail);
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

// Auth
export const api = {
  auth: {
    register: (data: object) => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: object) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => apiFetch('/api/auth/me'),
  },
  workflows: {
    list: () => apiFetch('/api/workflows'),
    create: (data: object) => apiFetch('/api/workflows', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => apiFetch(`/api/workflows/${id}`),
    update: (id: string, data: object) => apiFetch(`/api/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    publish: (id: string) => apiFetch(`/api/workflows/${id}/publish`, { method: 'POST' }),
    pause: (id: string) => apiFetch(`/api/workflows/${id}/pause`, { method: 'POST' }),
    delete: (id: string) => apiFetch(`/api/workflows/${id}`, { method: 'DELETE' }),
    validate: (id: string) => apiFetch(`/api/workflows/${id}/validate`, { method: 'POST' }),
    run: (id: string, data: object) => apiFetch(`/api/workflows/${id}/run`, { method: 'POST', body: JSON.stringify(data) }),
    runs: (id: string) => apiFetch(`/api/workflows/${id}/runs`),
    templates: () => apiFetch('/api/workflows/templates'),
    fromTemplate: (key: string) => apiFetch(`/api/workflows/from-template/${key}`, { method: 'POST' }),
  },
  applications: {
    list: () => apiFetch('/api/applications'),
    get: (id: string) => apiFetch(`/api/applications/${id}`),
    submit: (data: object) => apiFetch('/api/applications', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      apiFetch(`/api/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  runs: {
    list: () => apiFetch('/api/runs'),
    get: (id: string) => apiFetch(`/api/runs/${id}`),
    logs: (id: string) => apiFetch(`/api/runs/${id}/logs`),
    retryNode: (nodeRunId: string) =>
      apiFetch(`/api/runs/node-runs/${nodeRunId}/retry`, { method: 'POST' }),
  },
  notifications: {
    list: () => apiFetch('/api/notifications'),
  },
  health: () => apiFetch('/api/health'),
};

export const WS_BASE = API_BASE.replace('http', 'ws');

export default api;
