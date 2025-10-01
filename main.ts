import { Plugin } from "obsidian";
import { TimelineView, VIEW_TYPE_TIMELINE } from "./timeline-view";
import { TimelineSettingTab } from "./settings";
import { DailyNotesParser } from "./parser";
import { TimelineSettings, DEFAULT_SETTINGS } from "./types";

export default class DailyNotesTimelinePlugin extends Plugin {
  settings: TimelineSettings;
  parser: DailyNotesParser;

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
  }
}
