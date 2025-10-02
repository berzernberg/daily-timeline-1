import { QuickRangePreset } from "./types";

export interface CodeblockConfig {
  mode: "month" | "custom";
  startDate?: string;
  endDate?: string;
  show?: QuickRangePreset;
}

export class CodeblockConfigParser {
  parseConfig(source: string): CodeblockConfig | { error: string } {
    const lines = source.trim().split("\n");
    const config: Partial<CodeblockConfig> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) continue;

      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex === -1) continue;

      const key = trimmedLine.substring(0, colonIndex).trim();
      const value = trimmedLine.substring(colonIndex + 1).trim();

      switch (key) {
        case "mode":
          if (value === "month" || value === "custom") {
            config.mode = value;
          } else {
            return { error: `Invalid mode: "${value}". Must be "month" or "custom".` };
          }
          break;
        case "startDate":
          config.startDate = value;
          break;
        case "endDate":
          config.endDate = value;
          break;
        case "show":
          config.show = this.parseQuickRangePreset(value);
          if (!config.show) {
            return { error: `Invalid show preset: "${value}". Valid options: last-7, last-30, this-week, this-month, last-3m.` };
          }
          break;
      }
    }

    if (!config.mode) {
      return { error: 'Missing required parameter: "mode". Must specify "month" or "custom".' };
    }

    if (config.mode === "month" && config.startDate) {
      const parsedDate = this.parseDate(config.startDate);
      if (!parsedDate) {
        return { error: `Invalid startDate format: "${config.startDate}". Expected format: DD.MM.YYYY or YYYY-MM-DD.` };
      }
    }

    if (config.mode === "custom") {
      if (config.show) {
        if (config.startDate || config.endDate) {
          return { error: 'Cannot use "show" preset with explicit startDate/endDate. Use either "show" or explicit dates, not both.' };
        }
      } else {
        if (!config.startDate || !config.endDate) {
          return { error: 'Custom mode requires either "show" preset or both "startDate" and "endDate".' };
        }

        const start = this.parseDate(config.startDate);
        const end = this.parseDate(config.endDate);

        if (!start) {
          return { error: `Invalid startDate format: "${config.startDate}". Expected format: DD.MM.YYYY or YYYY-MM-DD.` };
        }

        if (!end) {
          return { error: `Invalid endDate format: "${config.endDate}". Expected format: DD.MM.YYYY or YYYY-MM-DD.` };
        }

        if (end < start) {
          return { error: `endDate (${config.endDate}) must be after or equal to startDate (${config.startDate}).` };
        }

        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 365) {
          return { error: `Date range cannot exceed 365 days. Current range: ${daysDiff} days.` };
        }
      }
    }

    return config as CodeblockConfig;
  }

  private parseQuickRangePreset(value: string): QuickRangePreset | null {
    const presetMap: Record<string, QuickRangePreset> = {
      "last-7": "last7days",
      "last-30": "last30days",
      "this-week": "thisweek",
      "this-month": "thismonth",
      "last-3m": "last3months",
    };

    return presetMap[value] || null;
  }

  parseDate(dateStr: string): Date | null {
    if (dateStr.includes(".")) {
      const parts = dateStr.split(".");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month - 1, day);
        }
      }
    } else if (dateStr.includes("-")) {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);

        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          return new Date(year, month - 1, day);
        }
      }
    }

    return null;
  }

  calculateDateRange(config: CodeblockConfig): { startDate: Date; endDate: Date } {
    if (config.mode === "month") {
      if (config.startDate) {
        const date = this.parseDate(config.startDate);
        if (date) {
          const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
          const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          return { startDate, endDate };
        }
      }
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate, endDate };
    }

    if (config.show) {
      return this.calculateQuickRangePreset(config.show);
    }

    const startDate = this.parseDate(config.startDate!)!;
    const endDate = this.parseDate(config.endDate!)!;
    return { startDate, endDate };
  }

  private calculateQuickRangePreset(preset: QuickRangePreset): { startDate: Date; endDate: Date } {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let startDate: Date;
    let endDate: Date;

    switch (preset) {
      case "last7days":
        endDate = new Date(now);
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 6);
        break;
      case "last30days":
        endDate = new Date(now);
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 29);
        break;
      case "thisweek":
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - dayOfWeek);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        break;
      case "thismonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "last3months":
        endDate = new Date(now);
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { startDate, endDate };
  }
}
