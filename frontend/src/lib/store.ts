import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: async (email, password) => {
        const data = await api.auth.login({ email, password });
        localStorage.setItem('ff_token', data.access_token);
        set({ user: { id: data.user_id, name: data.name, email: data.email, role: data.role }, token: data.access_token });
      },
      register: async (name, email, password) => {
        const data = await api.auth.register({ name, email, password });
        localStorage.setItem('ff_token', data.access_token);
        set({ user: { id: data.user_id, name: data.name, email: data.email, role: data.role }, token: data.access_token });
      },
      logout: () => {
        localStorage.removeItem('ff_token');
        set({ user: null, token: null });
      },
    }),
    { name: 'flowforge-auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);

// Workflow store
interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  active_version_id: string | null;
  is_template: boolean;
}

interface WorkflowState {
  workflows: Workflow[];
  loading: boolean;
  fetch: () => Promise<void>;
  create: (name: string, description: string) => Promise<Workflow>;
  delete: (id: string) => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  loading: false,
  fetch: async () => {
    set({ loading: true });
    try {
      const wfs = await api.workflows.list();
      set({ workflows: wfs });
    } finally {
      set({ loading: false });
    }
  },
  create: async (name, description) => {
    const wf = await api.workflows.create({ name, description });
    set((s) => ({ workflows: [wf, ...s.workflows] }));
    return wf;
  },
  delete: async (id) => {
    await api.workflows.delete(id);
    set((s) => ({ workflows: s.workflows.filter((w) => w.id !== id) }));
  },
}));
