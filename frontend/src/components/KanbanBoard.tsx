import { useState, useEffect } from 'react';
import type { Task, Project, User } from '../types';
import { api } from '../api/api';
import KanbanColumn from './KanbanColumn';
import TaskDrawer from './TaskDrawer';
import TaskForm from './TaskForm';

interface Props {
  project: Project;
}

const COLUMNS: { status: 'todo' | 'in_progress' | 'done'; label: string }[] = [
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
];

export default function KanbanBoard({ project }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const [taskTotalPages, setTaskTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<number | ''>('');
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadTasks();
  }, [project.id, taskPage, statusFilter, assigneeFilter]);

  useEffect(() => {
    loadUsers();
  }, [project.id]);

  // SSE real-time updates
  useEffect(() => {
    try{
      const es = api.taskEvents(project.id);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.event === 'task_created') {
        setTasks(prev => [...prev, data.task]);
      } else if (data.event === 'task_updated') {
        setTasks(prev => prev.map(t => (t.id === data.task.id ? data.task : t)));
      } else if (data.event === 'task_deleted') {
        setTasks(prev => prev.filter(t => t.id !== data.task_id));
      }
    };
    es.onerror = (e) => console.error('SSE error:', e);
    return () => es.close();
    } catch(err){
      console.log(err)
    }
  }, [project.id]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await api.listTasks(project.id, {
        status: statusFilter || undefined,
        assignee: assigneeFilter || undefined,
        page: taskPage,
        limit: 10,
      });
      setTasks(data.items);
      setTaskTotalPages(data.total_pages);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await api.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setAssigneeFilter('');
    setTaskPage(1);
  };

  const handleDragStart = (task: Task) => {
    setDraggingTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (status: 'todo' | 'in_progress' | 'done') => {
    if (!draggingTask || draggingTask.status === status) {
      setDraggingTask(null);
      return;
    }
    try {
      const updated = await api.updateTask(draggingTask.id, { status });
      setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    } catch (err) {
      console.error('Failed to move task:', err);
    } finally {
      setDraggingTask(null);
    }
  };

  const handleTaskCreated = (task: Task) => {
    setTasks(prev => [...prev, task]);
    setShowTaskForm(false);
  };

  const handleTaskUpdated = (updated: Task) => {
    setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);
  };

  const handleTaskDeleted = (taskId: number) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTask(null);
  };

  const getColumnTasks = (status: string) =>
    tasks.filter(t => t.status === status);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div>
          <h2 className="font-semibold text-gray-900 text-base sm:text-lg">{project.name}</h2>
          {project.description && (
            <p className="text-xs sm:text-sm text-gray-500 truncate max-w-40 sm:max-w-none">{project.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowTaskForm(true)}
          className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
        >
          + Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setTaskPage(1); }}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select
          value={assigneeFilter}
          onChange={e => { setAssigneeFilter(e.target.value ? Number(e.target.value) : ''); setTaskPage(1); }}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="">All Assignees</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        {(statusFilter || assigneeFilter) && (
          <button onClick={clearFilters} className="text-xs text-purple-600 hover:underline">
            Clear
          </button>
        )}
        {taskTotalPages > 1 && (
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
            <button
              onClick={() => setTaskPage(p => Math.max(1, p - 1))}
              disabled={taskPage <= 1}
              className="px-2 py-1 rounded disabled:opacity-40"
            >
              ‹
            </button>
            <span>{taskPage}/{taskTotalPages}</span>
            <button
              onClick={() => setTaskPage(p => Math.min(taskTotalPages, p + 1))}
              disabled={taskPage >= taskTotalPages}
              className="px-2 py-1 rounded disabled:opacity-40"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-2 sm:p-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>
        ) : (
          <div className="flex gap-2 sm:gap-4 h-full min-h-[400px]">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.status}
                status={col.status}
                label={col.label}
                tasks={getColumnTasks(col.status)}
                draggingTask={draggingTask}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(col.status)}
                onTaskClick={setSelectedTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          taskId={selectedTask.id}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          projectId={project.id}
          onClose={() => setShowTaskForm(false)}
          onCreated={handleTaskCreated}
        />
      )}
    </div>
  );
}