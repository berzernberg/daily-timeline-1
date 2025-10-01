import { TFile, Vault } from "obsidian";
import { TaskItem, DailyNote } from "./types";

export class DailyNotesParser {
  vault: Vault;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  async parseDailyNotes(
    folderPath: string,
    dateFormat: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyNote[]> {
    const dailyNotes: DailyNote[] = [];
    const files = this.vault.getMarkdownFiles();

    for (const file of files) {
      if (this.isInDailyNotesFolder(file.path, folderPath)) {
        const dateStr = this.extractDateFromFilename(file.name, dateFormat);
        if (dateStr) {
          const noteDate = this.parseDate(dateStr);
          if (noteDate && noteDate >= startDate && noteDate <= endDate) {
            const tasks = await this.extractTasks(file);
            if (tasks.length > 0) {
              dailyNotes.push({
                date: dateStr,
                path: file.path,
                tasks: tasks,
              });
            }
          }
        }
      }
    }

    return dailyNotes.sort((a, b) => a.date.localeCompare(b.date));
  }

  private isInDailyNotesFolder(filePath: string, folderPath: string): boolean {
    if (!folderPath) return true;
    return filePath.startsWith(folderPath);
  }

  private extractDateFromFilename(
    filename: string,
    dateFormat: string
  ): string | null {
    const nameWithoutExt = filename.replace(/\.md$/, "");

    if (dateFormat === "YYYY-MM-DD") {
      const match = nameWithoutExt.match(/(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : null;
    }

    return nameWithoutExt;
  }

  private parseDate(dateStr: string): Date | null {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    } catch {
      return null;
    }
  }

  private async extractTasks(file: TFile): Promise<TaskItem[]> {
    const content = await this.vault.cachedRead(file);
    const lines = content.split("\n");
    const tasks: TaskItem[] = [];
    let currentTask: TaskItem | null = null;

    const taskRegex = /^- \[([^\]]+)\]\s+\*(\d{2}:\d{2})\*\s+(.+)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(taskRegex);

      if (match) {
        if (currentTask) {
          tasks.push(currentTask);
        }

        const [, status, time, content] = match;
        const [hour, minute] = time.split(":").map(Number);

        currentTask = {
          status: status,
          time: time,
          content: content.trim(),
          subItems: [],
          date: this.extractDateFromFilename(file.name, "YYYY-MM-DD") || "",
          hour: hour,
          minute: minute,
        };
      } else if (currentTask && line.trim().startsWith("-") && line.includes("\t")) {
        currentTask.subItems.push(line.trim().substring(1).trim());
      } else if (currentTask && !line.trim().startsWith("-") && line.trim() !== "") {
        if (currentTask) {
          tasks.push(currentTask);
          currentTask = null;
        }
      }
    }

    if (currentTask) {
      tasks.push(currentTask);
    }

    return tasks;
  }
}
