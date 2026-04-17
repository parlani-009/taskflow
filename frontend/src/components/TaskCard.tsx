import type { Task } from '../types';

interface Props {
  task: Task;
  onDragStart: (task: Task) => void;
  onClick: (task: Task) => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

export default function TaskCard({ task, onDragStart, onClick }: Props) {
  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(task);
      }}
      onClick={() => onClick(task)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md hover:border-purple-300 transition"
    >
      <p className="font-medium text-gray-900 text-sm mb-2">{task.title}</p>
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        {task.due_date && (
          <span className="text-xs text-gray-400">{task.due_date}</span>
        )}
      </div>
    </div>
  );
}