import type { Project, ProjectWithTasks, Task, User } from '../types';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const API_BASE = import.meta.env.VITE_API_URL || '/';

function getToken() {
  return localStorage.getItem('token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const api = {
  register: (name: string, email: string, password: string) =>
    request<{ id: number; name: string; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<User>('/auth/me'),

  // Projects
  listProjects: (page = 1, limit = 10) =>
    request<PaginatedResponse<Project>>(`/projects/?page=${page}&limit=${limit}`),

  createProject: (name: string, description?: string) =>
    request<Project>('/projects/', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  getProject: (id: number) =>
    request<ProjectWithTasks>(`/projects/${id}`),

  updateProject: (id: number, name?: string, description?: string) =>
    request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, description }),
    }),

  deleteProject: (id: number) =>
    request<{ status: string; message: string }>(`/projects/${id}`, { method: 'DELETE' }),

  getAllUsers: () => request<User[]>('/projects/users/all'),

  // Tasks
  listTasks: (projectId: number, filters?: { status?: string; assignee?: number; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.assignee) params.set('assignee', String(filters.assignee));
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();
    return request<PaginatedResponse<Task>>(`/projects/${projectId}/tasks${qs ? '?' + qs : ''}`);
  },

  createTask: (
    projectId: number,
    data: {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      assignee_id?: number;
      due_date?: string;
    }
  ) =>
    request<Task>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (
    taskId: number,
    data: Partial<{
      title: string;
      description: string;
      status: string;
      priority: string;
      assignee_id: number;
      due_date: string;
    }>
  ) =>
    request<Task>(`/projects/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteTask: (taskId: number) =>
    request<{ status: string; message: string }>(`/projects/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  getTask: (taskId: number) =>
    request<Task>(`/projects/tasks/${taskId}`),

  getProjectStats: (projectId: number) =>
    request<{
      total: number;
      stats: Record<string, { todo: number; in_progress: number; done: number }>;
    }>(`/projects/${projectId}/stats`),

  // SSE
  taskEvents: (projectId: number): EventSource => {
    const token = getToken();
    console.log('url is ', `${API_BASE}/sse/projects/${projectId}/events?token=${token ?? ''}`)
    return new EventSource(`${API_BASE}/sse/projects/${projectId}/events?token=${token ?? ''}`);
  },
};