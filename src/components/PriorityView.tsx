import React from 'react';
import { Task, PrioritySection } from '../types';

const prioritySections: PrioritySection[] = [
  {
    id: 1,
    title: '1st Priority',
    description: 'Urgent and super important',
    color: '#FF4B4B'
  },
  {
    id: 2,
    title: '2nd Priority',
    description: 'Important but not urgent',
    color: '#FF9F1C'
  },
  {
    id: 3,
    title: '3rd Priority',
    description: 'Urgent but less important',
    color: '#2EC4B6'
  },
  {
    id: 4,
    title: '4th Priority',
    description: 'Neither urgent nor important',
    color: '#8338EC'
  }
];

interface PriorityViewProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, priority: number) => void;
}

export function PriorityView({ tasks, onUpdateTask }: PriorityViewProps) {
  const getRowColor = (sectionColor: string, index: number) => {
    const opacity = Math.max(0.1, 1 - (index * 0.15));
    return `${sectionColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Prioritize Items</h2>
        <p className="text-gray-600">Categorize your tasks based on their priority and importance.</p>
      </div>

      <div className="space-y-6">
        {prioritySections.map((section) => (
          <div
            key={section.id}
            className="border rounded-lg overflow-hidden shadow-sm"
            style={{ borderTopColor: section.color, borderTopWidth: '4px' }}
          >
            <div className="p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800">{section.title}</h3>
              <p className="text-sm text-gray-600">{section.description}</p>
            </div>

            <div className="divide-y">
              {tasks
                .filter(task => task.priority === section.id)
                .map((task, index) => (
                  <div
                    key={task.id}
                    className="p-3"
                    style={{ backgroundColor: getRowColor(section.color, index) }}
                  >
                    <select
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white bg-opacity-90"
                      value={task.content}
                      onChange={(e) => {
                        const selectedTask = tasks.find(t => t.content === e.target.value);
                        if (selectedTask) {
                          onUpdateTask(selectedTask.id, section.id);
                        }
                      }}
                    >
                      <option value="">Select a task</option>
                      {tasks.map((t) => (
                        <option key={t.id} value={t.content}>
                          {t.content}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              
              <div className="p-3 bg-white">
                <select
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value=""
                  onChange={(e) => {
                    const selectedTask = tasks.find(t => t.content === e.target.value);
                    if (selectedTask) {
                      onUpdateTask(selectedTask.id, section.id);
                    }
                  }}
                >
                  <option value="">Add a task to this priority...</option>
                  {tasks
                    .filter(t => !t.priority)
                    .map((task) => (
                      <option key={task.id} value={task.content}>
                        {task.content}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}