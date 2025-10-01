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
        text: "No date range selected",
      });
      return;
    }

    await this.renderContinuousTimeline(timelineScroll, dailyNotes);
  }

  private async renderContinuousTimeline(container: HTMLElement, dailyNotes: DailyNote[]): Promise<void> {
    const timelineContainer = container.createDiv({ cls: "timeline-continuous" });
    const timelineTrack = timelineContainer.createDiv({ cls: "timeline-track-continuous" });

    const segmentWidth = 200;
    const totalWidth = segmentWidth * dailyNotes.length;
    timelineTrack.style.width = `${totalWidth}px`;

    for (let i = 0; i < dailyNotes.length; i++) {
      const note = dailyNotes[i];
      await this.renderDaySegment(timelineTrack, note, i, dailyNotes.length, segmentWidth);
    }
  }

  private async renderDaySegment(track: HTMLElement, note: DailyNote, index: number, total: number, segmentWidth: number): Promise<void> {
    const segment = track.createDiv({ cls: "timeline-segment" });
    segment.style.width = `${segmentWidth}px`;
    segment.style.left = `${segmentWidth * index}px`;

    if (note.tasks.length === 0) {
      segment.addClass("timeline-segment-empty");
    }

    const dateObj = new Date(note.date);
    const dateLabel = segment.createDiv({ cls: "timeline-segment-date" });
    dateLabel.setText(
      dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    );

    const weekdayLabel = segment.createDiv({ cls: "timeline-segment-weekday" });
    weekdayLabel.setText(
      dateObj.toLocaleDateString("en-US", {
        weekday: "short",
      })
    );

    const startLabel = segment.createDiv({ cls: "timeline-segment-time timeline-segment-time-start" });
    startLabel.setText("00:00");

    const endLabel = segment.createDiv({ cls: "timeline-segment-time timeline-segment-time-end" });
    endLabel.setText("23:59");

    for (const task of note.tasks) {
      await this.renderTaskInSegment(segment, task);
    }
  }

  private async renderTaskInSegment(segment: HTMLElement, task: TaskItem): Promise<void> {
    const totalMinutes = task.hour * 60 + task.minute;
    const percentage = (totalMinutes / (24 * 60)) * 100;

    const taskDot = segment.createDiv({ cls: "timeline-task-dot" });
    taskDot.style.left = `${percentage}%`;
    taskDot.setAttribute("data-status", task.status);

    const taskLabel = taskDot.createDiv({ cls: "timeline-task-label" });
    taskLabel.setText(task.time);

    const tooltip = taskDot.createDiv({ cls: "timeline-tooltip" });
    const tooltipContent = tooltip.createDiv({ cls: "timeline-tooltip-content" });

    const taskText = tooltipContent.createDiv({ cls: "timeline-tooltip-task" });
    taskText.textContent = `[${task.status}] `;

    await this.renderTaskContent(taskText, task.content);

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

  private async renderTaskContent(container: HTMLElement, content: string): Promise<void> {
    const imageEmbedRegex = /!\[\[([^\]]+)\]\]/g;
    let lastIndex = 0;
    let match;

    while ((match = imageEmbedRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textSpan = container.createSpan();
        textSpan.textContent = content.substring(lastIndex, match.index);
      }

      const imageName = match[1];
      const imageFile = this.plugin.app.vault.getAbstractFileByPath(imageName);

      if (imageFile && imageFile instanceof this.plugin.app.vault.adapter.constructor) {
        const imageContainer = container.createDiv({ cls: "timeline-tooltip-image" });
        const img = imageContainer.createEl("img");
        const resourcePath = this.plugin.app.vault.getResourcePath(imageFile);
        img.src = resourcePath;
        img.alt = imageName;
      } else {
        const files = this.plugin.app.vault.getFiles();
        const matchedFile = files.find(f => f.name === imageName || f.path.endsWith(imageName));

        if (matchedFile) {
          const imageContainer = container.createDiv({ cls: "timeline-tooltip-image" });
          const img = imageContainer.createEl("img");
          const resourcePath = this.plugin.app.vault.getResourcePath(matchedFile);
          img.src = resourcePath;
          img.alt = imageName;
        } else {
          const textSpan = container.createSpan();
          textSpan.textContent = match[0];
        }
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      const textSpan = container.createSpan();
      textSpan.textContent = content.substring(lastIndex);
    }
  }
}
