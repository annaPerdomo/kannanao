export interface Todo {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  emoji: string;
  createdAt: number;
  frequencyDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat; empty = every day
  completedDates: string[]; // 'YYYY-MM-DD' ISO date strings
}
