export interface TaskItem {
  status: string;
  time: string;
  content: string;
  subItems: string[];
  date: string;
  hour: number;
  minute: number;
  firstTag?: string;
  hasAttachment?: boolean;
}

export interface DailyNote {
  date: string;
  path: string;
  tasks: TaskItem[];
}

export interface TagStylePreset {
  tag: string;
  color: string;
  emoji: string;
}

export interface GroupedTask {
  tasks: TaskItem[];
  position: number;
  averageTime: string;
}

export interface TimelineSettings {
  dailyNotesFolder: string;
  dateFormat: string;
  defaultRangeMonths: number;
  tagStyles: TagStylePreset[];
  enableGrouping: boolean;
  minSpacingPixels: number;
  maxGroupSpanPixels: number;
}

export const DEFAULT_SETTINGS: TimelineSettings = {
  dailyNotesFolder: "",
  dateFormat: "YYYY-MM-DD",
  defaultRangeMonths: 1,
  tagStyles: [],
  enableGrouping: true,
  minSpacingPixels: 25,
  maxGroupSpanPixels: 60,
};
