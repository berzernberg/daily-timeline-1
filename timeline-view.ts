import { ItemView, WorkspaceLeaf } from "obsidian";
import DailyNotesTimelinePlugin from "./main";
import { DailyNote, TaskItem, GroupedTask } from "./types";

export const VIEW_TYPE_TIMELINE = "daily-notes-timeline";

const ZOOM_CONFIG = {
  MIN: 0.7,
  MAX: 10.0,
  DEFAULT: 1.0,
  STEP: 0.5,
  BASE_SEGMENT_WIDTH: 200,
};

export class TimelineView extends ItemView {
  plugin: DailyNotesTimelinePlugin;
  private contentEl: HTMLElement;
  private startDate: Date;
  private endDate: Date;
  private tooltips: HTMLElement[] = [];
  private zoomLevel: number = ZOOM_CONFIG.DEFAULT;
  private timelineScrollEl: HTMLElement | null = null;
  private timelineContainerEl: HTMLElement | null = null;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartScrollLeft: number = 0;

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
    const centerGroup = controlsDiv.createDiv({ cls: "timeline-controls-center" });
    const rightGroup = controlsDiv.createDiv({ cls: "timeline-controls-right" });

    const monthSelect = rightGroup.createEl("select", { cls: "dropdown timeline-month-select" });
    await this.populateMonthSelect(monthSelect);

    monthSelect.addEventListener("change", async () => {
      const [year, month] = monthSelect.value.split("-").map(Number);
      this.startDate = new Date(year, month, 1);
      this.endDate = new Date(year, month + 1, 0);
      this.zoomLevel = ZOOM_CONFIG.DEFAULT;
      await this.renderTimeline();
      this.updateZoomSlider();
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
      this.zoomLevel = ZOOM_CONFIG.DEFAULT;
      await this.updateMonthSelect(monthSelect);
      await this.renderTimeline();
      this.updateZoomSlider();
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
      this.zoomLevel = ZOOM_CONFIG.DEFAULT;
      await this.updateMonthSelect(monthSelect);
      await this.renderTimeline();
      this.updateZoomSlider();
    });

    const todayButton = leftGroup.createEl("button", {
      text: "Today",
      cls: "mod-cta",
    });
    todayButton.addEventListener("click", async () => {
      const now = new Date();
      this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      this.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.zoomLevel = ZOOM_CONFIG.DEFAULT;
      await this.updateMonthSelect(monthSelect);
      await this.renderTimeline();
      this.updateZoomSlider();
    });

    this.renderZoomControls(centerGroup);
  }

  private renderZoomControls(container: HTMLElement): void {
    const zoomContainer = container.createDiv({ cls: "timeline-zoom-controls" });

    const zoomOutButton = zoomContainer.createEl("button", {
      cls: "timeline-zoom-button",
      attr: { "aria-label": "Zoom out" },
    });
    zoomOutButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path><line x1="8" y1="11" x2="14" y2="11"></line></svg>';
    zoomOutButton.addEventListener("click", () => {
      const newZoom = Math.max(ZOOM_CONFIG.MIN, this.zoomLevel - ZOOM_CONFIG.STEP);
      this.applyZoom(newZoom);
    });

    const sliderContainer = zoomContainer.createDiv({ cls: "timeline-zoom-slider-container" });
    const zoomSlider = sliderContainer.createEl("input", {
      type: "range",
      cls: "timeline-zoom-slider",
    });
    zoomSlider.min = String(ZOOM_CONFIG.MIN * 100);
    zoomSlider.max = String(ZOOM_CONFIG.MAX * 100);
    zoomSlider.value = String(this.zoomLevel * 100);
    zoomSlider.step = String(ZOOM_CONFIG.STEP * 100);

    const zoomLabel = sliderContainer.createDiv({ cls: "timeline-zoom-label" });
    zoomLabel.setText(`${Math.round(this.zoomLevel * 100)}%`);

    const zoomInButton = zoomContainer.createEl("button", {
      cls: "timeline-zoom-button",
      attr: { "aria-label": "Zoom in" },
    });
    zoomInButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>';
    zoomInButton.addEventListener("click", () => {
      const newZoom = Math.min(ZOOM_CONFIG.MAX, this.zoomLevel + ZOOM_CONFIG.STEP);
      this.applyZoom(newZoom);
    });

    zoomSlider.addEventListener("input", () => {
      const newZoomLevel = parseFloat(zoomSlider.value) / 100;
      zoomLabel.setText(`${Math.round(newZoomLevel * 100)}%`);
    });

    zoomSlider.addEventListener("change", () => {
      const newZoomLevel = parseFloat(zoomSlider.value) / 100;
      this.applyZoom(newZoomLevel);
    });

    this.zoomSlider = zoomSlider;
    this.zoomLabel = zoomLabel;
  }

  private updateZoomSlider(): void {
    if (this.zoomSlider) {
      this.zoomSlider.value = String(this.zoomLevel * 100);
    }
    if (this.zoomLabel) {
      this.zoomLabel.setText(`${Math.round(this.zoomLevel * 100)}%`);
    }
  }

  private applyZoom(newZoomLevel: number, anchorX?: number): void {
    if (!this.timelineContainerEl) return;

    const scrollContainer = this.timelineContainerEl;
    const scrollLeft = scrollContainer.scrollLeft;
    const containerWidth = scrollContainer.clientWidth;
    const scrollWidth = scrollContainer.scrollWidth;

    let contentAnchorX: number;
    if (anchorX !== undefined) {
      contentAnchorX = scrollLeft + anchorX;
    } else {
      contentAnchorX = scrollLeft + containerWidth / 2;
    }

    const anchorRatio = contentAnchorX / scrollWidth;

    this.zoomLevel = newZoomLevel;
    this.updateZoomSlider();

    this.renderTimeline().then(() => {
      if (!this.timelineContainerEl) return;

      const newScrollWidth = this.timelineContainerEl.scrollWidth;
      const newContentAnchorX = anchorRatio * newScrollWidth;
      const newScrollLeft = anchorX !== undefined
        ? newContentAnchorX - anchorX
        : newContentAnchorX - containerWidth / 2;

      this.timelineContainerEl.scrollLeft = Math.max(0, newScrollLeft);
    });
  }

  private setupTimelineInteractions(timelineContainer: HTMLElement): void {
    timelineContainer.addEventListener("wheel", (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = timelineContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const delta = -e.deltaY;
        const zoomFactor = delta > 0 ? ZOOM_CONFIG.STEP : -ZOOM_CONFIG.STEP;
        const newZoom = Math.max(
          ZOOM_CONFIG.MIN,
          Math.min(ZOOM_CONFIG.MAX, this.zoomLevel + zoomFactor)
        );
        this.applyZoom(newZoom, mouseX);
      } else {
        e.preventDefault();
        timelineContainer.scrollLeft += e.deltaY;
      }
    });

    timelineContainer.addEventListener("mousedown", (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest(".timeline-task") || target.closest("a")) {
        return;
      }
      e.preventDefault();
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartScrollLeft = timelineContainer.scrollLeft;
      timelineContainer.style.cursor = "grabbing";
      timelineContainer.style.userSelect = "none";
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.isDragging || !this.timelineContainerEl) return;
      e.preventDefault();
      const deltaX = e.clientX - this.dragStartX;
      this.timelineContainerEl.scrollLeft = this.dragStartScrollLeft - deltaX;
    };

    const handleMouseUp = () => {
      if (this.isDragging && this.timelineContainerEl) {
        this.isDragging = false;
        this.timelineContainerEl.style.cursor = "grab";
        this.timelineContainerEl.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    timelineContainer.addEventListener("mouseleave", () => {
      if (this.isDragging && this.timelineContainerEl) {
        this.isDragging = false;
        this.timelineContainerEl.style.cursor = "grab";
        this.timelineContainerEl.style.userSelect = "";
      }
    });
  }

  private zoomSlider: HTMLInputElement | null = null;
  private zoomLabel: HTMLElement | null = null;

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
    this.timelineScrollEl = timelineScroll;

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
    this.timelineContainerEl = timelineContainer;
    this.setupTimelineInteractions(timelineContainer);

    const timelineTrack = timelineContainer.createDiv({ cls: "timeline-track-continuous" });

    const segmentWidth = ZOOM_CONFIG.BASE_SEGMENT_WIDTH * this.zoomLevel;
    const totalWidth = segmentWidth * dailyNotes.length;
    timelineTrack.style.width = `${totalWidth}px`;

    for (let i = 0; i < dailyNotes.length; i++) {
      const note = dailyNotes[i];
      await this.renderDaySegment(timelineTrack, note, i, dailyNotes.length, segmentWidth);
    }
  }

  private groupOverlappingTasks(tasks: TaskItem[], segmentWidth: number): (TaskItem | GroupedTask)[] {
    if (tasks.length === 0) return [];

    const sortedTasks = [...tasks].sort((a, b) => {
      const aMinutes = a.hour * 60 + a.minute;
      const bMinutes = b.hour * 60 + b.minute;
      return aMinutes - bMinutes;
    });

    const MIN_SPACING_PIXELS = 25;
    const groups: (TaskItem | GroupedTask)[] = [];
    let currentGroup: TaskItem[] = [sortedTasks[0]];

    for (let i = 1; i < sortedTasks.length; i++) {
      const prevTask = sortedTasks[i - 1];
      const currTask = sortedTasks[i];

      const prevPercentage = ((prevTask.hour * 60 + prevTask.minute) / (24 * 60)) * 100;
      const currPercentage = ((currTask.hour * 60 + currTask.minute) / (24 * 60)) * 100;

      const pixelDiff = Math.abs(currPercentage - prevPercentage) * (segmentWidth / 100);

      if (pixelDiff < MIN_SPACING_PIXELS) {
        currentGroup.push(currTask);
      } else {
        if (currentGroup.length > 1) {
          const avgMinutes = currentGroup.reduce((sum, t) => sum + (t.hour * 60 + t.minute), 0) / currentGroup.length;
          const avgPercentage = (avgMinutes / (24 * 60)) * 100;
          const avgHour = Math.floor(avgMinutes / 60);
          const avgMinute = Math.floor(avgMinutes % 60);
          groups.push({
            tasks: currentGroup,
            position: avgPercentage,
            averageTime: `${String(avgHour).padStart(2, '0')}:${String(avgMinute).padStart(2, '0')}`
          });
        } else {
          groups.push(currentGroup[0]);
        }
        currentGroup = [currTask];
      }
    }

    if (currentGroup.length > 1) {
      const avgMinutes = currentGroup.reduce((sum, t) => sum + (t.hour * 60 + t.minute), 0) / currentGroup.length;
      const avgPercentage = (avgMinutes / (24 * 60)) * 100;
      const avgHour = Math.floor(avgMinutes / 60);
      const avgMinute = Math.floor(avgMinutes % 60);
      groups.push({
        tasks: currentGroup,
        position: avgPercentage,
        averageTime: `${String(avgHour).padStart(2, '0')}:${String(avgMinute).padStart(2, '0')}`
      });
    } else {
      groups.push(currentGroup[0]);
    }

    return groups;
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

    if (note.path) {
      dateLabel.addClass("timeline-segment-date-clickable");
      dateLabel.addEventListener("click", async (e) => {
        e.preventDefault();
        const file = this.app.vault.getAbstractFileByPath(note.path);
        if (file) {
          await this.app.workspace.getLeaf(false).openFile(file as any);
        }
      });
    }

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

    const groupedItems = this.groupOverlappingTasks(note.tasks, segmentWidth);

    for (const item of groupedItems) {
      if ('tasks' in item) {
        await this.renderGroupedTaskInSegment(segment, item as GroupedTask);
      } else {
        await this.renderTaskInSegment(segment, item as TaskItem);
      }
    }
  }

  private getTagStyle(tag: string | undefined) {
    if (!tag) return null;
    return this.plugin.settings.tagStyles.find(style => style.tag === tag);
  }

  private async renderGroupedTaskInSegment(segment: HTMLElement, groupedTask: GroupedTask): Promise<void> {
    const taskDotContainer = segment.createDiv({ cls: "timeline-task-dot-container timeline-task-grouped" });
    taskDotContainer.style.left = `${groupedTask.position}%`;

    const taskDot = taskDotContainer.createDiv({ cls: "timeline-task-dot" });
    taskDot.setAttribute("data-status", "grouped");

    const countBadge = taskDot.createDiv({ cls: "timeline-task-count-badge" });
    countBadge.setText(String(groupedTask.tasks.length));

    const emojiContainer = taskDotContainer.createDiv({ cls: "timeline-emoji-stack" });
    for (const task of groupedTask.tasks) {
      const tagStyle = this.getTagStyle(task.firstTag);
      if (tagStyle && tagStyle.emoji) {
        const emojiEl = emojiContainer.createDiv({ cls: "timeline-task-emoji" });
        emojiEl.setText(tagStyle.emoji);
      }
    }

    const tooltip = document.body.createDiv({ cls: "timeline-tooltip" });
    this.tooltips.push(tooltip);

    const tooltipWrapper = tooltip.createDiv({ cls: "timeline-tooltip-wrapper" });

    for (let i = 0; i < groupedTask.tasks.length; i++) {
      const task = groupedTask.tasks[i];
      const tooltipContent = tooltipWrapper.createDiv({ cls: "timeline-tooltip-content" });

      if (i > 0) {
        tooltipContent.addClass("timeline-tooltip-stacked");
      }

      const timeHeader = tooltipContent.createDiv({ cls: "timeline-tooltip-time" });
      timeHeader.setText(task.time);

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
    }

    taskDotContainer.addEventListener("mouseenter", () => {
      const rect = taskDotContainer.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const tooltipEstimatedHeight = groupedTask.tasks.length * 120;

      let tooltipTop = rect.bottom + 12;
      let tooltipLeft = rect.left + rect.width / 2;
      let transform = "translateX(-50%)";
      let isAbove = false;

      if (tooltipTop + tooltipEstimatedHeight > viewportHeight - 20) {
        const availableHeight = viewportHeight - tooltipTop - 20;
        if (availableHeight < 200) {
          tooltipTop = rect.top - Math.min(tooltipEstimatedHeight, viewportHeight * 0.6) - 12;
          isAbove = true;
          if (tooltipTop < 20) {
            tooltipTop = 20;
          }
        }
      }

      const maxHeight = Math.min(viewportHeight * 0.7, tooltipEstimatedHeight);
      tooltipWrapper.style.maxHeight = `${maxHeight}px`;

      if (isAbove) {
        tooltip.addClass("tooltip-above");
      } else {
        tooltip.removeClass("tooltip-above");
      }

      tooltip.style.top = `${tooltipTop}px`;
      tooltip.style.left = `${tooltipLeft}px`;
      tooltip.style.transform = transform;
      tooltip.addClass("is-visible");
      taskDotContainer.addClass("is-hovered");
    });

    taskDotContainer.addEventListener("mouseleave", () => {
      tooltip.removeClass("is-visible");
      tooltip.removeClass("tooltip-above");
      taskDotContainer.removeClass("is-hovered");
    });

    tooltip.addEventListener("mouseenter", () => {
      tooltip.addClass("is-visible");
      taskDotContainer.addClass("is-hovered");
    });

    tooltip.addEventListener("mouseleave", () => {
      tooltip.removeClass("is-visible");
      tooltip.removeClass("tooltip-above");
      taskDotContainer.removeClass("is-hovered");
    });
  }

  private async renderTaskInSegment(segment: HTMLElement, task: TaskItem): Promise<void> {
    const totalMinutes = task.hour * 60 + task.minute;
    const percentage = (totalMinutes / (24 * 60)) * 100;

    const taskDotContainer = segment.createDiv({ cls: "timeline-task-dot-container" });
    taskDotContainer.style.left = `${percentage}%`;

    const taskDot = taskDotContainer.createDiv({ cls: "timeline-task-dot" });
    taskDot.setAttribute("data-status", task.status);

    const tagStyle = this.getTagStyle(task.firstTag);
    if (tagStyle && tagStyle.color) {
      taskDot.addClass("timeline-task-dot-custom");
      taskDot.style.setProperty("background-color", tagStyle.color, "important");
    }

    const taskLabel = taskDot.createDiv({ cls: "timeline-task-label" });
    taskLabel.setText(task.time);

    const emojiContainer = taskDotContainer.createDiv({ cls: "timeline-emoji-stack" });
    if (tagStyle && tagStyle.emoji) {
      const emojiEl = emojiContainer.createDiv({ cls: "timeline-task-emoji" });
      emojiEl.setText(tagStyle.emoji);
    }

    const tooltip = document.body.createDiv({ cls: "timeline-tooltip" });
    this.tooltips.push(tooltip);
    const tooltipContent = tooltip.createDiv({ cls: "timeline-tooltip-content" });

    const timeHeader = tooltipContent.createDiv({ cls: "timeline-tooltip-time" });
    timeHeader.setText(task.time);

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

    taskDotContainer.addEventListener("mouseenter", () => {
      const rect = taskDotContainer.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      let tooltipTop = rect.bottom + 12;

      setTimeout(() => {
        const tooltipHeight = tooltip.offsetHeight;

        if (tooltipTop + tooltipHeight > viewportHeight - 20) {
          tooltipTop = rect.top - tooltipHeight - 12;
          tooltip.addClass("tooltip-above");
          if (tooltipTop < 20) {
            tooltipTop = 20;
          }
        } else {
          tooltip.removeClass("tooltip-above");
        }

        tooltip.style.top = `${tooltipTop}px`;
      }, 0);

      tooltip.style.top = `${tooltipTop}px`;
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.transform = "translateX(-50%)";
      tooltip.addClass("is-visible");
      taskDotContainer.addClass("is-hovered");
    });

    taskDotContainer.addEventListener("mouseleave", () => {
      tooltip.removeClass("is-visible");
      tooltip.removeClass("tooltip-above");
      taskDotContainer.removeClass("is-hovered");
    });

    tooltip.addEventListener("mouseenter", () => {
      tooltip.addClass("is-visible");
      taskDotContainer.addClass("is-hovered");
    });

    tooltip.addEventListener("mouseleave", () => {
      tooltip.removeClass("is-visible");
      tooltip.removeClass("tooltip-above");
      taskDotContainer.removeClass("is-hovered");
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
    const tagRegex = /#([\p{L}\p{N}_\/-]+)/gu;
    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const textSpan = container.createSpan();
        textSpan.textContent = text.substring(lastIndex, match.index);
      }

      const tagText = match[1];
      const tagLink = container.createEl("a", {
        cls: "tag timeline-tooltip-tag",
        href: "#",
      });
      tagLink.textContent = `#${tagText}`;

      tagLink.addEventListener("click", async (e) => {
        e.preventDefault();
        (this.app as any).internalPlugins.getPluginById("global-search")?.instance.openGlobalSearch(`tag:#${tagText}`);
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const textSpan = container.createSpan();
      textSpan.textContent = text.substring(lastIndex);
    }
  }

  private renderLink(container: HTMLElement, linkText: string): void {
    const pipeSplit = linkText.split("|");
    const actualLink = pipeSplit[0].trim();
    const displayText = pipeSplit.length > 1 ? pipeSplit[1].trim() : actualLink;

    const link = container.createEl("a", {
      cls: "internal-link timeline-tooltip-link",
      href: "#",
    });
    link.textContent = displayText;

    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const file = this.plugin.app.metadataCache.getFirstLinkpathDest(actualLink, "");
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
