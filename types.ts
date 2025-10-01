export interface TaskItem {
  status: string;
  time: string;
  content: string;
  subItems: string[];
  date: string;
  hour: number;
  minute: number;
}

export interface DailyNote {
  date: string;
  path: string;
  tasks: TaskItem[];
}

export interface TimelineSettings {
  dailyNotesFolder: string;
  dateFormat: string;
  defaultRangeMonths: number;
}

export const DEFAULT_SETTINGS: TimelineSettings = {
  dailyNotesFolder: "",
  dateFormat: "YYYY-MM-DD",
  defaultRangeMonths: 1,
};
