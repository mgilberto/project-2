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
  const [prioritizedTasks, setPrioritizedTasks] = useState<Task[]>([]);

  useEffect(() => {
    console.log('Tasks updated:', tasks);
    setPrioritizedTasks(tasks);
  }, [tasks]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const newPriority = parseInt(result.destination.droppableId);
    
    console.log('Drag end:', { taskId, newPriority });
    onUpdateTask(taskId, newPriority);
  };

  const handleTaskSelect = (taskId: string, priority: number) => {
    console.log('Selecting task:', { taskId, priority });
    onUpdateTask(taskId, priority);
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