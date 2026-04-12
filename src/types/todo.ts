export interface Todo {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  emoji: string;
  createdAt: number;
  frequencyDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat; empty = single-day task on createdAt
  completedDates: string[]; // 'YYYY-MM-DD' ISO date strings
}

export interface EntryType {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface CalendarEntry {
  id: string;
  title: string;
  typeId: string;
  emoji: string;
  color: string;
  startDateISO: string;
  endDateISO: string;
  frequencyDays?: number[];
}
