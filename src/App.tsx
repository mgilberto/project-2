import React, { useState, useCallback, useEffect } from 'react';
import { Layout, ListTodo, Calendar, Brain, Menu, X } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { MindFlow } from './components/MindFlow';
import { PriorityView } from './components/PriorityView';
import { WeeklySchedule } from './components/WeeklySchedule';
import { Task, TimeSlot } from './types';

type View = 'mindflow' | 'priority' | 'schedule';

const STORAGE_KEYS = {
  TASKS: 'hippoplan_tasks',
  SCHEDULE: 'hippoplan_schedule',
  CURRENT_VIEW: 'hippoplan_current_view'
} as const;

function App() {
  // Initialize state from localStorage or defaults
  const [currentView, setCurrentView] = useState<View>(() => {
    const savedView = localStorage.getItem(STORAGE_KEYS.CURRENT_VIEW);
    return (savedView as View) || 'mindflow';
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    return savedTasks ? JSON.parse(savedTasks) : [];
  });

  const [schedule, setSchedule] = useState<TimeSlot[]>(() => {
    const savedSchedule = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    return savedSchedule ? JSON.parse(savedSchedule) : [];
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Persist state changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_VIEW, currentView);
  }, [currentView]);

  const views = [
    { id: 'mindflow' as View, icon: Brain, label: 'Mind Flow' },
    { id: 'priority' as View, icon: ListTodo, label: 'Prioritize' },
    { id: 'schedule' as View, icon: Calendar, label: 'Schedule' }
  ];

  const currentViewIndex = views.findIndex(v => v.id === currentView);

  const handleTasksChange = (newTaskContents: string[]) => {
    setTasks(prevTasks => {
      // Create a map of existing tasks by content for quick lookup
      const existingTasksMap = new Map(
        prevTasks.map(task => [task.content, task])
      );

      // Map new contents to tasks, preserving existing tasks when possible
      const newTasks = newTaskContents.map(content => {
        const existingTask = existingTasksMap.get(content);
        if (existingTask) {
          return existingTask;
        }
        return {
          id: Math.random().toString(36).substr(2, 9),
          content,
          priority: 0 // Initialize with no priority
        };
      });

      return newTasks;
    });
  };

  const updateTaskPriority = (taskId: string, priority: number) => {
    setTasks(prevTasks => 
      prevTasks.map(task =>
        task.id === taskId 
          ? { ...task, priority } 
          : task
      )
    );
  };

  const scheduleTask = (day: string, period: 'am' | 'pm', slot: number, taskId: string) => {
    setSchedule(prev => {
      const newSchedule = prev.filter(
        s => !(s.day === day && s.period === period && s.slot === slot)
      );
      return [...newSchedule, { day, period, slot, taskId }];
    });
  };

  const navigateView = useCallback((direction: 'left' | 'right') => {
    setCurrentView(currentView => {
      const currentIndex = views.findIndex(v => v.id === currentView);
      if (direction === 'left') {
        return views[(currentIndex + 1) % views.length].id;
      } else {
        return views[(currentIndex - 1 + views.length) % views.length].id;
      }
    });
  }, [views]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigateView('left'),
    onSwipedRight: () => navigateView('right'),
    preventScrollOnSwipe: true,
    trackMouse: false
  });

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Layout className="h-8 w-8 text-purple-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Hippoplan</span>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500"
              >
                {isMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>

            {/* Desktop navigation */}
            <nav className="hidden md:flex space-x-4">
              {views.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setCurrentView(id)}
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

        {/* Mobile navigation menu */}
        <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {views.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => {
                  setCurrentView(id);
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2 rounded-md text-base font-medium ${
                  currentView === id
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main 
        {...swipeHandlers}
        className="relative mt-16 overflow-hidden"
      >
        <div className="relative w-screen">
          <div 
            className="flex transition-transform duration-300 ease-in-out"
            style={{
              transform: `translateX(${-currentViewIndex * 100}vw)`,
              width: '300vw'
            }}
          >
            <div className="w-screen flex-shrink-0">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <MindFlow
                  tasks={tasks.map(t => t.content)}
                  onTasksChange={handleTasksChange}
                />
              </div>
            </div>
            <div className="w-screen flex-shrink-0">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <PriorityView
                  tasks={tasks}
                  onUpdateTask={updateTaskPriority}
                />
              </div>
            </div>
            <div className="w-screen flex-shrink-0">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <WeeklySchedule
                  tasks={tasks}
                  schedule={schedule}
                  onScheduleTask={scheduleTask}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Swipe indicator */}
        <div className="fixed bottom-4 left-0 right-0 flex justify-center space-x-2">
          {views.map((view, index) => (
            <div
              key={view.id}
              className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                currentViewIndex === index ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;