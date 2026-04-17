import { useState, useEffect } from 'react';
import type { Task, User } from '../types';
import { api } from '../api/api';

interface Props {
  taskId: number;
  onClose: () => void;
  onUpdated: (task: Task) => void;
  onDeleted: (taskId: number) => void;
}

export default function TaskDrawer({ taskId, onClose, onUpdated, onDeleted }: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assignee_id, setAssigneeId] = useState<number | undefined>();
  const [due_date, setDueDate] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch latest task data when drawer opens
  useEffect(() => {
    api.getTask(taskId).then(data => {
      setTask(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setStatus(data.status);
      setPriority(data.priority);
      setAssigneeId(data.assignee_id);
      setDueDate(data.due_date || '');
    }).catch(err => console.error(err));
  }, [taskId]);

  // Load users for assignee dropdown
  useEffect(() => {
    api.getAllUsers().then(data => setUsers(data)).catch(err => console.error(err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateTask(taskId, {
        title,
        description: description || undefined,
        status,
        priority,
        assignee_id,
        due_date: due_date || undefined,
      });
      setTask(updated);
      onUpdated(updated);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    setDeleting(true);
    try {
      await api.deleteTask(taskId);
      onDeleted(taskId);
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (!task) {
    return (
      <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col items-center justify-center">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col max-w-md">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Task Details</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as Task['status'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as Task['priority'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
          <input
            type="date"
            value={due_date}
            onChange={e => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Assignee</label>
          <select
            value={assignee_id ?? ''}
            onChange={e => setAssigneeId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Unassigned</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-100 disabled:opacity-50"
        >
          {deleting ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}