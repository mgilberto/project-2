import React from 'react';
import { Task, TimeSlot } from '../types';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const periods = ['am', 'pm'] as const;
const slots = [1, 2, 3];

const priorityColors = {
  1: '#FF4B4B',
  2: '#FF9F1C',
  3: '#2EC4B6',
  4: '#8338EC'
} as const;

interface WeeklyScheduleProps {
  tasks: Task[];
  schedule: TimeSlot[];
  onScheduleTask: (day: string, period: 'am' | 'pm', slot: number, taskId: string) => void;
}

export function WeeklySchedule({ tasks, schedule, onScheduleTask }: WeeklyScheduleProps) {
  const getTaskForSlot = (day: string, period: 'am' | 'pm', slot: number) => {
    const timeSlot = schedule.find(s => s.day === day && s.period === period && s.slot === slot);
    return timeSlot?.taskId ? tasks.find(t => t.id === timeSlot.taskId) : undefined;
  };

  const getPriorityColor = (task?: Task) => {
    if (!task?.priority) return undefined;
    const color = priorityColors[task.priority];
    return { backgroundColor: `${color}22` }; // 22 is hex for 13% opacity
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Weekly Schedule</h2>
        <p className="text-gray-600">Assign tasks to specific time slots in your weekly calendar.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 border bg-gray-50">Day</th>
              {periods.map(period => (
                <th key={period} colSpan={3} className="p-3 border bg-gray-50">
                  {period.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day}>
                <td className="p-3 border font-medium">{day}</td>
                {periods.map(period => (
                  slots.map(slot => {
                    const currentTask = getTaskForSlot(day, period, slot);
                    return (
                      <td key={`${day}-${period}-${slot}`} className="p-3 border">
                        <select
                          className="w-full p-2 border rounded"
                          value={currentTask?.id || ''}
                          onChange={(e) => onScheduleTask(day, period, slot, e.target.value)}
                          style={getPriorityColor(currentTask)}
                        >
                          <option value="">Select a task...</option>
                          {tasks.map(task => (
                            <option
                              key={task.id}
                              value={task.id}
                              style={getPriorityColor(task)}
                            >
                              {task.content}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}