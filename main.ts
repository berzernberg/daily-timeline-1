import { Plugin, MarkdownPostProcessorContext } from "obsidian";
import { TimelineView, VIEW_TYPE_TIMELINE } from "./timeline-view";
import { TimelineSettingTab } from "./settings";
import { DailyNotesParser } from "./parser";
import { TimelineSettings, DEFAULT_SETTINGS } from "./types";
import { CodeblockConfigParser } from "./codeblock-config";
import { EmbeddedTimeline } from "./embedded-timeline";

export default class DailyNotesTimelinePlugin extends Plugin {
  settings: TimelineSettings;
  parser: DailyNotesParser;
  private embeddedTimelines: Map<HTMLElement, EmbeddedTimeline> = new Map();

  async onload() {
    await this.loadSettings();

    this.parser = new DailyNotesParser(this.app.vault);

    this.registerView(
      VIEW_TYPE_TIMELINE,
      (leaf) => new TimelineView(leaf, this)
    );

    this.addRibbonIcon("calendar-clock", "Open Daily Notes Timeline", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-timeline-view",
      name: "Open Daily Notes Timeline",
      callback: () => {
        this.activateView();
      },
    });

    this.addSettingTab(new TimelineSettingTab(this.app, this));

    this.registerMarkdownCodeBlockProcessor(
      "daily-timeline",
      this.processTimelineCodeblock.bind(this)
    );
  }

  private async processTimelineCodeblock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): Promise<void> {
    const parser = new CodeblockConfigParser();
    const result = parser.parseConfig(source);

    if ("error" in result) {
      el.createDiv({
        cls: "embedded-timeline-error",
        text: `⚠️ Timeline Configuration Error: ${result.error}`,
      });
      return;
    }

    const existingTimeline = this.embeddedTimelines.get(el);
    if (existingTimeline) {
      existingTimeline.destroy();
      this.embeddedTimelines.delete(el);
    }

    const embeddedTimeline = new EmbeddedTimeline(this, el, result);
    this.embeddedTimelines.set(el, embeddedTimeline);

    try {
      await embeddedTimeline.render();
    } catch (error) {
      el.createDiv({
        cls: "embedded-timeline-error",
        text: `⚠️ Failed to render timeline: ${error.message}`,
      });
    }
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(VIEW_TYPE_TIMELINE)[0];

    if (!leaf) {
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({
        type: VIEW_TYPE_TIMELINE,
        active: true,
      });
    }

    workspace.revealLeaf(leaf);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_TIMELINE);

    for (const timeline of this.embeddedTimelines.values()) {
      timeline.destroy();
    }
    this.embeddedTimelines.clear();
  }
}
