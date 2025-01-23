import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Task, TimeSlot } from '../types';

interface WeeklyScheduleProps {
  tasks: Task[];
  schedule: TimeSlot[];
  onScheduleTask: (day: string, period: 'am' | 'pm', slot: number, taskId: string) => void;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const periods = ['am', 'pm'] as const;
const slots = [1, 2, 3, 4];

export function WeeklySchedule({ tasks, schedule, onScheduleTask }: WeeklyScheduleProps) {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [showDayPicker, setShowDayPicker] = useState(false);

  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityA = a.priority || 4;
    const priorityB = b.priority || 4;
    return priorityA - priorityB;
  });

  const getTaskForSlot = (day: string, period: 'am' | 'pm', slot: number) => {
    const timeSlot = schedule.find(
      s => s.day === day && s.period === period && s.slot === slot
    );
    if (!timeSlot) return null;
    return tasks.find(t => t.id === timeSlot.taskId);
  };

  const handlePrevDay = () => {
    setCurrentDayIndex((prev) => (prev - 1 + days.length) % days.length);
  };

  const handleNextDay = () => {
    setCurrentDayIndex((prev) => (prev + 1) % days.length);
  };

  const currentDay = days[currentDayIndex];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Weekly Schedule</h2>

        {/* Task Priority Legend */}
        <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Task Priority</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map(priority => (
              <div key={priority} className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  priority === 1 ? 'bg-red-500' :
                  priority === 2 ? 'bg-yellow-500' :
                  priority === 3 ? 'bg-green-500' :
                  'bg-gray-300'
                }`} />
                <span className="text-sm text-gray-600">
                  Priority {priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Day Navigation - Mobile */}
        <div className="md:hidden">
          <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm mb-4">
            <button
              onClick={handlePrevDay}
              className="p-2 text-gray-600 hover:text-gray-800 active:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setShowDayPicker(!showDayPicker)}
              className="flex-1 mx-4 text-lg font-medium text-gray-800"
            >
              {currentDay}
            </button>
            <button
              onClick={handleNextDay}
              className="p-2 text-gray-600 hover:text-gray-800 active:bg-gray-100 rounded-full"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {showDayPicker && (
            <div className="absolute z-10 inset-x-4 bg-white rounded-lg shadow-lg p-2">
              {days.map((day, index) => (
                <button
                  key={day}
                  onClick={() => {
                    setCurrentDayIndex(index);
                    setShowDayPicker(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-md ${
                    currentDayIndex === index
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Schedule */}
        <div className="hidden md:block overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-6 gap-4">
              <div className="sticky left-0 bg-white"></div>
              {days.map(day => (
                <div key={day} className="text-center font-medium text-gray-700">
                  {day}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Schedule */}
      <div className="md:hidden">
        <div className="space-y-6">
          {periods.map(period => (
            <div key={period} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 uppercase">
                {period === 'am' ? 'Morning' : 'Afternoon'}
              </div>
              <div className="divide-y">
                {slots.map(slot => {
                  const task = getTaskForSlot(currentDay, period, slot);
                  return (
                    <div key={slot} className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Slot {slot}</span>
                        <select
                          value={task?.id || ''}
                          onChange={(e) => onScheduleTask(currentDay, period, slot, e.target.value)}
                          className="flex-1 mx-4 p-2 text-sm border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Select task</option>
                          {sortedTasks.map(task => (
                            <option key={task.id} value={task.id}>
                              {task.content}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Schedule Content */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-[800px]">
          {periods.map(period => (
            <div key={period} className="mb-8">
              <div className="grid grid-cols-6 gap-4 mb-2">
                <div className="sticky left-0 bg-white text-sm font-medium text-gray-700">
                  {period === 'am' ? 'Morning' : 'Afternoon'}
                </div>
              </div>
              {slots.map(slot => (
                <div key={slot} className="grid grid-cols-6 gap-4 mb-2">
                  <div className="sticky left-0 bg-white text-sm text-gray-500">
                    Slot {slot}
                  </div>
                  {days.map(day => {
                    const task = getTaskForSlot(day, period, slot);
                    return (
                      <select
                        key={day}
                        value={task?.id || ''}
                        onChange={(e) => onScheduleTask(day, period, slot, e.target.value)}
                        className="p-2 text-sm border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select task</option>
                        {sortedTasks.map(task => (
                          <option key={task.id} value={task.id}>
                            {task.content}
                          </option>
                        ))}
                      </select>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Task Priority Legend */}
      <div className="mt-8 p-4 bg-white rounded-lg shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Task Priority</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map(priority => (
            <div key={priority} className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                priority === 1 ? 'bg-red-500' :
                priority === 2 ? 'bg-yellow-500' :
                priority === 3 ? 'bg-green-500' :
                'bg-gray-300'
              }`} />
              <span className="text-sm text-gray-600">
                Priority {priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}