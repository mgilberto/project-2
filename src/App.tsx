import React, { useState } from 'react';
import { Layout, ListTodo, Calendar, Brain } from 'lucide-react';
import { MindFlow } from './components/MindFlow';
import { PriorityView } from './components/PriorityView';
import { WeeklySchedule } from './components/WeeklySchedule';
import { Task, TimeSlot } from './types';

type View = 'mindflow' | 'priority' | 'schedule';

function App() {
  const [currentView, setCurrentView] = useState<View>('mindflow');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<TimeSlot[]>([]);

  const handleTasksChange = (newTasks: string[]) => {
    setTasks(prevTasks => {
      // Create a map of existing tasks by content for quick lookup
      const existingTasksMap = new Map(prevTasks.map(task => [task.content, task]));
      
      return newTasks.map(content => {
        // If we have an existing task with this content, preserve its ID and priority
        const existingTask = existingTasksMap.get(content);
        if (existingTask) {
          return existingTask;
        }
        
        // Otherwise create a new task
        return {
          id: Math.random().toString(36).substr(2, 9),
          content
        };
      });
    });
  };

  const updateTaskPriority = (taskId: string, priority: number) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, priority: priority as 1 | 2 | 3 | 4 } : task
    ));
  };

  const scheduleTask = (day: string, period: 'am' | 'pm', slot: number, taskId: string) => {
    setSchedule(prev => {
      const newSchedule = prev.filter(
        s => !(s.day === day && s.period === period && s.slot === slot)
      );
      return [...newSchedule, { day, period, slot, taskId }];
    });
  };

  const views = [
    { id: 'mindflow', icon: Brain, label: 'Mind Flow' },
    { id: 'priority', icon: ListTodo, label: 'Prioritize' },
    { id: 'schedule', icon: Calendar, label: 'Schedule' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Layout className="h-8 w-8 text-purple-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Hippoplan</span>
            </div>
            
            <nav className="flex space-x-4">
              {views.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setCurrentView(id as View)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === id
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'mindflow' && (
          <MindFlow
            tasks={tasks.map(t => t.content)}
            onTasksChange={handleTasksChange}
          />
        )}
        
        {currentView === 'priority' && (
          <PriorityView
            tasks={tasks}
            onUpdateTask={updateTaskPriority}
          />
        )}
        
        {currentView === 'schedule' && (
          <WeeklySchedule
            tasks={tasks}
            schedule={schedule}
            onScheduleTask={scheduleTask}
          />
        )}
      </main>
    </div>
  );
}

export default App;