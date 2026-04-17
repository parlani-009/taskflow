export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  project_id: number;
  assignee_id?: number;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectWithTasks {
  project: Project;
  tasks: Task[];
}