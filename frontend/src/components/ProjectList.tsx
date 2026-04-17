import { useState } from 'react';
import type { Project } from '../types';
import { api } from '../api/api';

interface Props {
  projects: Project[];
  selectedId: number | null;
  onSelect: (project: Project) => void;
  onCreated: (project: Project) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function ProjectList({ projects, selectedId, onSelect, onCreated, page, totalPages, onPageChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const project = await api.createProject(name, desc || undefined);
      onCreated(project);
      setName('');
      setDesc('');
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create');
      console.log(error)
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-56 sm:w-60 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900 text-lg">Projects</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition ${
              selectedId === p.id ? 'bg-purple-50 border-l-2 border-l-purple-600' : ''
            }`}
          >
            <span className="font-medium text-gray-900 text-sm">{p.name}</span>
            {p.description && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{p.description}</p>
            )}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200">
        {totalPages > 1 && (
          <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-2 py-1 rounded disabled:opacity-40"
            >
              ‹
            </button>
            <span>{page}/{totalPages}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-2 py-1 rounded disabled:opacity-40"
            >
              ›
            </button>
          </div>
        )}
        {showForm ? (
          <form onSubmit={handleCreate} className="space-y-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Project name"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              required
            />
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-purple-600 text-white text-sm py-1.5 rounded-lg"
              >
                {loading ? '...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="flex-1 bg-gray-100 text-gray-700 text-sm py-1.5 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            + New Project
          </button>
        )}
      </div>
    </div>
  );
}