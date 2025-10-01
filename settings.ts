import { App, PluginSettingTab, Setting } from "obsidian";
import DailyNotesTimelinePlugin from "./main";

export class TimelineSettingTab extends PluginSettingTab {
  plugin: DailyNotesTimelinePlugin;

  constructor(app: App, plugin: DailyNotesTimelinePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Daily Notes Timeline Settings" });

    new Setting(containerEl)
      .setName("Daily Notes Folder")
      .setDesc(
        "Path to your daily notes folder (leave empty for vault root or default daily notes location)"
      )
      .addText((text) =>
        text
          .setPlaceholder("Daily Notes")
          .setValue(this.plugin.settings.dailyNotesFolder)
          .onChange(async (value) => {
            this.plugin.settings.dailyNotesFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Date Format")
      .setDesc("Format used in daily note filenames (e.g., YYYY-MM-DD)")
      .addText((text) =>
        text
          .setPlaceholder("YYYY-MM-DD")
          .setValue(this.plugin.settings.dateFormat)
          .onChange(async (value) => {
            this.plugin.settings.dateFormat = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default Timeline Range")
      .setDesc("Number of months to display by default")
      .addSlider((slider) =>
        slider
          .setLimits(1, 12, 1)
          .setValue(this.plugin.settings.defaultRangeMonths)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.defaultRangeMonths = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
