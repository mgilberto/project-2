export interface Task {
  id: string;
  content: string;
  priority?: 1 | 2 | 3 | 4;
  scheduleSlot?: string;
}

export interface TimeSlot {
  day: string;
  period: 'am' | 'pm';
  slot: number;
  taskId?: string;
}

export interface PrioritySection {
  id: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  color: string;
}