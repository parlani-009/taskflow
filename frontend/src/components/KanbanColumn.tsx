import { useState } from 'react';
import type { Task } from '../types';
import TaskCard from './TaskCard';

interface Props {
  status: 'todo' | 'in_progress' | 'done';
  label: string;
  tasks: Task[];
  draggingTask: Task | null;
  onDragStart: (task: Task) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onTaskClick: (task: Task) => void;
}

const statusColors: Record<string, string> = {
  todo: 'bg-gray-100',
  in_progress: 'bg-blue-100',
  done: 'bg-green-100',
};

export default function KanbanColumn({
  status, label, tasks, draggingTask: _draggingTask, onDragStart, onDragOver, onDrop, onTaskClick,
}: Props) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`w-48 sm:flex-1 sm:min-w-[200px] rounded-xl p-3 flex flex-col gap-3 transition-colors shrink-0 ${
        isDragOver ? 'ring-2 ring-purple-400' : ''
      } ${statusColors[status]}`}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); onDragOver(e); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => { setIsDragOver(false); onDrop(); }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 text-sm">{label}</h3>
        <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>

      <div className="space-y-2 min-h-[100px]">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onClick={onTaskClick}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-gray-400 text-xs py-4">Drop tasks here</div>
        )}
      </div>
    </div>
  );
}