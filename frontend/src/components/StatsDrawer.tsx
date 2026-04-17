import { useState, useEffect } from 'react';
import type { User } from '../types';
import { api } from '../api/api';

interface Props {
  projectId: number;
  onClose: () => void;
}

interface Stats {
  total: number;
  stats: Record<string, { todo: number; in_progress: number; done: number }>;
}

export default function StatsDrawer({ projectId, onClose }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getProjectStats(projectId),
      api.getAllUsers(),
    ]).then(([statsData, usersData]) => {
      setStats(statsData);
      setUsers(usersData);
    }).catch(err => console.error(err)).finally(() => setLoading(false));
  }, [projectId]);

  const getUserName = (key: string): string => {
    if (key === 'None') return 'Unassigned';
    const id = parseInt(key, 10);
    const user = users.find(u => u.id === id);
    return user ? user.name : `User ${id}`;
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col max-w-md">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Project Stats</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : stats ? (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Total tasks: <span className="font-semibold text-gray-900">{stats.total}</span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500 font-medium">Assignee</th>
                  <th className="text-center py-2 text-gray-500 font-medium">To Do</th>
                  <th className="text-center py-2 text-gray-500 font-medium">In Progress</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Done</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.stats).map(([key, counts]) => {
                  const total = counts.todo + counts.in_progress + counts.done;
                  return (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-2.5 font-medium text-gray-800">{getUserName(key)}</td>
                      <td className="text-center py-2.5 text-gray-600">{counts.todo}</td>
                      <td className="text-center py-2.5 text-gray-600">{counts.in_progress}</td>
                      <td className="text-center py-2.5 text-gray-600">{counts.done}</td>
                      <td className="text-center py-2.5 font-semibold text-gray-900">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <div className="text-center text-red-400 py-8">Failed to load stats</div>
        )}
      </div>
    </div>
  );
}