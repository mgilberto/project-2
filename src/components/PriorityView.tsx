import React, { useEffect, useState } from 'react';
import { Task, PrioritySection } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

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
  const [prioritizedTasks, setPrioritizedTasks] = useState<Task[]>(() => {
    const savedPriorities = localStorage.getItem('hippoplan_task_priorities');
    const savedTasks = savedPriorities ? JSON.parse(savedPriorities) : null;
    
    if (savedTasks) {
      // Merge saved priorities with current tasks
      const taskMap = new Map(tasks.map(task => [task.id, task]));
      return savedTasks.filter((task: Task) => taskMap.has(task.id));
    }
    
    return tasks;
  });

  // Persist priorities to localStorage
  useEffect(() => {
    localStorage.setItem('hippoplan_task_priorities', JSON.stringify(prioritizedTasks));
  }, [prioritizedTasks]);

  // Update local state when tasks change
  useEffect(() => {
    setPrioritizedTasks(prevTasks => {
      const taskMap = new Map(prevTasks.map(task => [task.id, task]));
      const newTasks = tasks.filter(task => !taskMap.has(task.id));
      return [...prevTasks, ...newTasks];
    });
  }, [tasks]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    const sourceDroppableId = result.source.droppableId;
    const destinationDroppableId = result.destination.droppableId;

    const newPriority = parseInt(destinationDroppableId);
    const taskId = result.draggableId;

    const updatedTasks = [...prioritizedTasks];
    const [removed] = updatedTasks.splice(sourceIndex, 1);
    updatedTasks.splice(destinationIndex, 0, { ...removed, priority: newPriority });

    setPrioritizedTasks(updatedTasks);
    onUpdateTask(taskId, newPriority);
  };

  const handleTaskSelect = (taskId: string, priority: number) => {
    const task = prioritizedTasks.find(t => t.id === taskId);
    if (task) {
      setPrioritizedTasks(prevTasks => 
        prevTasks.map(t => t.id === taskId ? { ...t, priority } : t)
      );
      onUpdateTask(taskId, priority);
    }
  };

  const getPriorityTasks = (priority: number) => {
    return prioritizedTasks.filter(task => task.priority === priority);
  };

  const getUnprioritizedTasks = () => {
    return prioritizedTasks.filter(task => !task.priority || task.priority === 0);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Prioritize Tasks</h2>
        <p className="text-gray-600">Drag and drop tasks to set their priority level, or use the dropdowns to assign priorities.</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-6">
          {[1, 2, 3, 4].map((priority) => (
            <Droppable key={priority} droppableId={String(priority)}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`p-4 rounded-lg border ${
                    snapshot.isDraggingOver ? 'bg-purple-50' : 'bg-white'
                  }`}
                >
                  <h3 className="text-lg font-medium mb-3">
                    Priority {priority}
                    {priority === 1 && ' - Urgent & Important'}
                    {priority === 2 && ' - Important'}
                    {priority === 3 && ' - Urgent'}
                    {priority === 4 && ' - Neither'}
                  </h3>
                  <div className="space-y-2">
                    {getPriorityTasks(priority).map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 rounded border ${
                              snapshot.isDragging
                                ? 'bg-purple-100 border-purple-300'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            {task.content}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    <div className="mt-2">
                      <select
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                        onChange={(e) => {
                          const taskId = e.target.value;
                          if (taskId) {
                            handleTaskSelect(taskId, priority);
                          }
                        }}
                        value=""
                      >
                        <option value="">Add a task to this priority...</option>
                        {getUnprioritizedTasks().map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.content}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}