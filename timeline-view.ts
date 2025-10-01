import { ItemView, WorkspaceLeaf } from "obsidian";
import DailyNotesTimelinePlugin from "./main";
import { DailyNote, TaskItem } from "./types";

export const VIEW_TYPE_TIMELINE = "daily-notes-timeline";

export class TimelineView extends ItemView {
  plugin: DailyNotesTimelinePlugin;
  private contentEl: HTMLElement;
  private startDate: Date;
  private endDate: Date;

  constructor(leaf: WorkspaceLeaf, plugin: DailyNotesTimelinePlugin) {
    super(leaf);
    this.plugin = plugin;

    const now = new Date();
    this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  getViewType(): string {
    return VIEW_TYPE_TIMELINE;
  }

  getDisplayText(): string {
    return "Daily Notes Timeline";
  }

  getIcon(): string {
    return "calendar-clock";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("timeline-view-container");

    this.contentEl = container.createDiv({ cls: "timeline-content" });

    this.renderControls();
    await this.renderTimeline();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  private renderControls(): void {
    const controlsDiv = this.contentEl.createDiv({ cls: "timeline-controls" });

    const monthSelect = controlsDiv.createEl("select", { cls: "dropdown" });
    const currentYear = new Date().getFullYear();

    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        const option = monthSelect.createEl("option");
        option.value = `${year}-${month}`;
        option.text = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        });

        if (
          year === this.startDate.getFullYear() &&
          month === this.startDate.getMonth()
        ) {
          option.selected = true;
        }
      }
    }

    monthSelect.addEventListener("change", async () => {
      const [year, month] = monthSelect.value.split("-").map(Number);
      this.startDate = new Date(year, month, 1);
      this.endDate = new Date(year, month + 1, 0);
      await this.renderTimeline();
    });

    const prevButton = controlsDiv.createEl("button", {
      text: "← Previous",
      cls: "mod-cta",
    });
    prevButton.addEventListener("click", async () => {
      this.startDate = new Date(
        this.startDate.getFullYear(),
        this.startDate.getMonth() - 1,
        1
      );
      this.endDate = new Date(
        this.endDate.getFullYear(),
        this.endDate.getMonth(),
        0
      );
      await this.updateMonthSelect(monthSelect);
      await this.renderTimeline();
    });

    const nextButton = controlsDiv.createEl("button", {
      text: "Next →",
      cls: "mod-cta",
    });
    nextButton.addEventListener("click", async () => {
      this.startDate = new Date(
        this.startDate.getFullYear(),
        this.startDate.getMonth() + 1,
        1
      );
      this.endDate = new Date(
        this.endDate.getFullYear(),
        this.endDate.getMonth() + 2,
        0
      );
      await this.updateMonthSelect(monthSelect);
      await this.renderTimeline();
    });

    const todayButton = controlsDiv.createEl("button", {
      text: "Today",
      cls: "mod-cta",
    });
    todayButton.addEventListener("click", async () => {
      const now = new Date();
      this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      this.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      await this.updateMonthSelect(monthSelect);
      await this.renderTimeline();
    });
  }

  private async updateMonthSelect(select: HTMLSelectElement): Promise<void> {
    select.value = `${this.startDate.getFullYear()}-${this.startDate.getMonth()}`;
  }

  private async renderTimeline(): Promise<void> {
    const existingTimeline = this.contentEl.querySelector(".timeline-scroll");
    if (existingTimeline) {
      existingTimeline.remove();
    }

    const timelineScroll = this.contentEl.createDiv({
      cls: "timeline-scroll",
    });

    const dailyNotes = await this.plugin.parser.parseDailyNotes(
      this.plugin.settings.dailyNotesFolder,
      this.plugin.settings.dateFormat,
      this.startDate,
      this.endDate
    );

    if (dailyNotes.length === 0) {
      timelineScroll.createDiv({
        cls: "timeline-empty",
        text: "No tasks found in the selected date range",
      });
      return;
    }

    for (const note of dailyNotes) {
      this.renderDayTimeline(timelineScroll, note);
    }
  }

  private renderDayTimeline(container: HTMLElement, note: DailyNote): void {
    const dayContainer = container.createDiv({ cls: "timeline-day" });

    const dateHeader = dayContainer.createDiv({ cls: "timeline-date-header" });
    const dateObj = new Date(note.date);
    dateHeader.setText(
      dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );

    const timelineTrack = dayContainer.createDiv({ cls: "timeline-track" });

    const startLabel = timelineTrack.createDiv({ cls: "timeline-time-label timeline-time-start" });
    startLabel.setText("00:00");

    const endLabel = timelineTrack.createDiv({ cls: "timeline-time-label timeline-time-end" });
    endLabel.setText("23:59");

    for (const task of note.tasks) {
      this.renderTask(timelineTrack, task);
    }
  }

  private renderTask(track: HTMLElement, task: TaskItem): void {
    const totalMinutes = task.hour * 60 + task.minute;
    const percentage = (totalMinutes / (24 * 60)) * 100;

    const taskDot = track.createDiv({ cls: "timeline-task-dot" });
    taskDot.style.left = `${percentage}%`;
    taskDot.setAttribute("data-status", task.status);

    const taskLabel = taskDot.createDiv({ cls: "timeline-task-label" });
    taskLabel.setText(task.time);

    const tooltip = taskDot.createDiv({ cls: "timeline-tooltip" });
    const tooltipContent = tooltip.createDiv({ cls: "timeline-tooltip-content" });

    const taskText = tooltipContent.createDiv({ cls: "timeline-tooltip-task" });
    taskText.setText(`[${task.status}] ${task.content}`);

    if (task.subItems.length > 0) {
      const subList = tooltipContent.createEl("ul", { cls: "timeline-tooltip-subitems" });
      for (const subItem of task.subItems) {
        subList.createEl("li").setText(subItem);
      }
    }

    taskDot.addEventListener("mouseenter", () => {
      tooltip.addClass("is-visible");
    });

    taskDot.addEventListener("mouseleave", () => {
      tooltip.removeClass("is-visible");
    });
  }
}
