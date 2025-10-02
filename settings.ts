import { App, PluginSettingTab, Setting } from "obsidian";
import DailyNotesTimelinePlugin from "./main";
import { TagStylePreset } from "./types";

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

    containerEl.createEl("h2", { text: "Tag Styles" });
    containerEl.createEl("p", {
      text: "Customize the appearance of timeline points based on the first hashtag in each task.",
      cls: "setting-item-description"
    });

    this.displayTagStylesList(containerEl);
    this.displayAddTagStyleForm(containerEl);

    this.displayGroupingSettings(containerEl);
  }

  private displayGroupingSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h2", { text: "Points Grouping" });
    containerEl.createEl("p", {
      text: "Configure how timeline points are grouped when they appear close together. Grouping helps reduce visual clutter by combining nearby tasks into a single point with a count badge.",
      cls: "setting-item-description"
    });

    new Setting(containerEl)
      .setName("Enable Grouping")
      .setDesc("When enabled, tasks that appear close together on the timeline will be automatically grouped")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableGrouping)
          .onChange(async (value) => {
            this.plugin.settings.enableGrouping = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Minimum Spacing")
      .setDesc("Minimum distance (in pixels) between tasks before they are grouped together. Lower values create more groups.")
      .addSlider((slider) =>
        slider
          .setLimits(10, 100, 5)
          .setValue(this.plugin.settings.minSpacingPixels)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.minSpacingPixels = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Maximum Group Span")
      .setDesc("Maximum distance (in pixels) between the first and last task in a group. Prevents overly large groups.")
      .addSlider((slider) =>
        slider
          .setLimits(30, 150, 10)
          .setValue(this.plugin.settings.maxGroupSpanPixels)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxGroupSpanPixels = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .addButton((button) =>
        button
          .setButtonText("Reset to Defaults")
          .setTooltip("Restore default grouping settings")
          .onClick(async () => {
            this.plugin.settings.enableGrouping = true;
            this.plugin.settings.minSpacingPixels = 25;
            this.plugin.settings.maxGroupSpanPixels = 60;
            await this.plugin.saveSettings();
            this.display();
          })
      );
  }

  private displayTagStylesList(containerEl: HTMLElement): void {
    const listContainer = containerEl.createDiv({ cls: "tag-styles-list" });

    if (this.plugin.settings.tagStyles.length === 0) {
      listContainer.createEl("p", {
        text: "No tag styles configured yet. Add one below.",
        cls: "setting-item-description"
      });
      return;
    }

    this.plugin.settings.tagStyles.forEach((preset, index) => {
      const presetContainer = listContainer.createDiv({ cls: "tag-style-preset" });

      const infoDiv = presetContainer.createDiv({ cls: "tag-style-info" });

      const colorSwatch = infoDiv.createDiv({ cls: "tag-style-color-swatch" });
      colorSwatch.style.backgroundColor = preset.color;

      const tagName = infoDiv.createSpan({ cls: "tag-style-tag-name" });
      tagName.setText(`#${preset.tag}`);

      if (preset.emoji) {
        const emojiPreview = infoDiv.createSpan({ cls: "tag-style-emoji-preview" });
        emojiPreview.setText(preset.emoji);
      }

      const actionsDiv = presetContainer.createDiv({ cls: "tag-style-actions" });

      const editButton = actionsDiv.createEl("button", { text: "Edit", cls: "mod-cta" });
      editButton.addEventListener("click", () => {
        this.editTagStyle(index, preset);
      });

      const deleteButton = actionsDiv.createEl("button", { text: "Delete", cls: "mod-warning" });
      deleteButton.addEventListener("click", async () => {
        this.plugin.settings.tagStyles.splice(index, 1);
        await this.plugin.saveSettings();
        this.display();
      });
    });
  }

  private displayAddTagStyleForm(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "Add New Tag Style" });

    const formContainer = containerEl.createDiv({ cls: "tag-style-form" });

    let tagInput: HTMLInputElement;
    let colorInput: HTMLInputElement;
    let emojiInput: HTMLInputElement;

    new Setting(formContainer)
      .setName("Tag Name")
      .setDesc("Enter tag name without the # symbol (e.g., 'log' for #log, or 'log/work' for #log/work)")
      .addText((text) => {
        tagInput = text.inputEl;
        text.setPlaceholder("log/work");
      });

    new Setting(formContainer)
      .setName("Color")
      .setDesc("Choose a color for the timeline point")
      .addColorPicker((color) => {
        colorInput = color.colorPickerEl as HTMLInputElement;
        color.setValue("#3b82f6");
      });

    new Setting(formContainer)
      .setName("Emoji (Optional)")
      .setDesc("Enter an emoji to display below the timeline point")
      .addText((text) => {
        emojiInput = text.inputEl;
        text.setPlaceholder("📝");
      });

    new Setting(formContainer)
      .addButton((button) =>
        button
          .setButtonText("Add Style")
          .setCta()
          .onClick(async () => {
            const tag = tagInput.value.trim().toLowerCase();
            const color = colorInput.value;
            const emoji = emojiInput.value.trim();

            if (!tag) {
              alert("Please enter a tag name");
              return;
            }

            if (this.plugin.settings.tagStyles.some(s => s.tag === tag)) {
              alert(`A style for tag "${tag}" already exists`);
              return;
            }

            this.plugin.settings.tagStyles.push({ tag, color, emoji });
            await this.plugin.saveSettings();
            this.display();
          })
      );
  }

  private editTagStyle(index: number, preset: TagStylePreset): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Edit Tag Style" });

    const formContainer = containerEl.createDiv({ cls: "tag-style-form" });

    let tagInput: HTMLInputElement;
    let colorInput: HTMLInputElement;
    let emojiInput: HTMLInputElement;

    new Setting(formContainer)
      .setName("Tag Name")
      .setDesc("Tag name without the # symbol")
      .addText((text) => {
        tagInput = text.inputEl;
        text.setValue(preset.tag);
      });

    new Setting(formContainer)
      .setName("Color")
      .setDesc("Choose a color for the timeline point")
      .addColorPicker((color) => {
        colorInput = color.colorPickerEl as HTMLInputElement;
        color.setValue(preset.color);
      });

    new Setting(formContainer)
      .setName("Emoji (Optional)")
      .setDesc("Enter an emoji to display below the timeline point")
      .addText((text) => {
        emojiInput = text.inputEl;
        text.setValue(preset.emoji || "");
      });

    new Setting(formContainer)
      .addButton((button) =>
        button
          .setButtonText("Save")
          .setCta()
          .onClick(async () => {
            const tag = tagInput.value.trim().toLowerCase();
            const color = colorInput.value;
            const emoji = emojiInput.value.trim();

            if (!tag) {
              alert("Please enter a tag name");
              return;
            }

            const existingIndex = this.plugin.settings.tagStyles.findIndex(s => s.tag === tag);
            if (existingIndex !== -1 && existingIndex !== index) {
              alert(`A style for tag "${tag}" already exists`);
              return;
            }

            this.plugin.settings.tagStyles[index] = { tag, color, emoji };
            await this.plugin.saveSettings();
            this.display();
          })
      )
      .addButton((button) =>
        button
          .setButtonText("Cancel")
          .onClick(() => {
            this.display();
          })
      );
  }
}
