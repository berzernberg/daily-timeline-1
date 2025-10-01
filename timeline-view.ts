import { ItemView, WorkspaceLeaf } from "obsidian";
import DailyNotesTimelinePlugin from "./main";
import { DailyNote, TaskItem } from "./types";

export const VIEW_TYPE_TIMELINE = "daily-notes-timeline";

export class TimelineView extends ItemView {
  plugin: DailyNotesTimelinePlugin;
  private contentEl: HTMLElement;
  private startDate: Date;
  private endDate: Date;
  private tooltips: HTMLElement[] = [];

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

    await this.renderControls();
    await this.renderTimeline();
  }

  async onClose(): Promise<void> {
    this.cleanupTooltips();
    this.contentEl.empty();
  }

  private cleanupTooltips(): void {
    for (const tooltip of this.tooltips) {
      tooltip.remove();
    }
    this.tooltips = [];
  }

  private async renderControls(): Promise<void> {
    const controlsDiv = this.contentEl.createDiv({ cls: "timeline-controls" });

    const leftGroup = controlsDiv.createDiv({ cls: "timeline-controls-left" });
    const rightGroup = controlsDiv.createDiv({ cls: "timeline-controls-right" });

    const monthSelect = rightGroup.createEl("select", { cls: "dropdown timeline-month-select" });
    await this.populateMonthSelect(monthSelect);

    monthSelect.addEventListener("change", async () => {
      const [year, month] = monthSelect.value.split("-").map(Number);
      this.startDate = new Date(year, month, 1);
      this.endDate = new Date(year, month + 1, 0);
      await this.renderTimeline();
    });

    const prevButton = leftGroup.createEl("button", {
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

    const nextButton = leftGroup.createEl("button", {
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

    const todayButton = leftGroup.createEl("button", {
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

  private async populateMonthSelect(select: HTMLSelectElement): Promise<void> {
    const availableMonths = await this.plugin.parser.getAvailableMonths(
      this.plugin.settings.dailyNotesFolder,
      this.plugin.settings.dateFormat
    );

    select.empty();

    for (const monthKey of availableMonths) {
      const [year, month] = monthKey.split("-").map(Number);
      const date = new Date(year, month, 1);
      const option = select.createEl("option");
      option.value = monthKey;
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

  private async updateMonthSelect(select: HTMLSelectElement): Promise<void> {
    select.value = `${this.startDate.getFullYear()}-${this.startDate.getMonth()}`;
  }

  private async renderTimeline(): Promise<void> {
    this.cleanupTooltips();
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

    const tooltip = document.body.createDiv({ cls: "timeline-tooltip" });
    this.tooltips.push(tooltip);
    const tooltipContent = tooltip.createDiv({ cls: "timeline-tooltip-content" });

    const taskText = tooltipContent.createDiv({ cls: "timeline-tooltip-task" });
    taskText.textContent = `[${task.status}] `;

    await this.renderTaskContent(taskText, task.content);

    if (task.subItems.length > 0) {
      const subList = tooltipContent.createEl("ul", { cls: "timeline-tooltip-subitems" });
      for (const subItem of task.subItems) {
        const listItem = subList.createEl("li");
        await this.renderTaskContent(listItem, subItem);
      }
    }

    taskDot.addEventListener("mouseenter", () => {
      const rect = taskDot.getBoundingClientRect();
      tooltip.style.top = `${rect.bottom + 12}px`;
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.transform = "translateX(-50%)";
      tooltip.addClass("is-visible");
    });

    taskDot.addEventListener("mouseleave", () => {
      tooltip.removeClass("is-visible");
    });

    tooltip.addEventListener("mouseenter", () => {
      tooltip.addClass("is-visible");
    });

    tooltip.addEventListener("mouseleave", () => {
      tooltip.removeClass("is-visible");
    });
  }

  private async renderTaskContent(container: HTMLElement, content: string): Promise<void> {
    const combinedRegex = /(!\[\[([^\]]+)\]\])|(\[\[([^\]]+)\]\])/g;
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        await this.renderTextWithLinks(container, content.substring(lastIndex, match.index));
      }

      if (match[1]) {
        const imageName = match[2];
        await this.renderImage(container, imageName);
      } else if (match[3]) {
        const linkText = match[4];
        this.renderLink(container, linkText);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      await this.renderTextWithLinks(container, content.substring(lastIndex));
    }
  }

  private async renderTextWithLinks(container: HTMLElement, text: string): Promise<void> {
    const textSpan = container.createSpan();
    textSpan.textContent = text;
  }

  private renderLink(container: HTMLElement, linkText: string): void {
    const link = container.createEl("a", {
      cls: "internal-link timeline-tooltip-link",
      href: "#",
    });
    link.textContent = linkText;

    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const file = this.plugin.app.metadataCache.getFirstLinkpathDest(linkText, "");
      if (file) {
        await this.plugin.app.workspace.getLeaf(false).openFile(file);
      }
    });
  }

  private async renderImage(container: HTMLElement, imageName: string): Promise<void> {
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
      }
    }
  }
}
