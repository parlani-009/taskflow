import { useState } from 'react';
import type { Project } from '../types';
import { api } from '../api/api';

interface Props {
  project: Project;
  onClose: () => void;
  onUpdated: (project: Project) => void;
  onDeleted: (projectId: number) => void;
}

export default function ProjectDrawer({ project, onClose, onUpdated, onDeleted }: Props) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateProject(project.id, name, description || undefined);
      onUpdated(updated);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this project and all its tasks?')) return;
    setDeleting(true);
    try {
      await api.deleteProject(project.id);
      onDeleted(project.id);
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col max-w-md">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Project Details</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
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