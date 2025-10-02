# Daily Notes Timeline - Obsidian Plugin

A plugin for Obsidian that visualizes tasks from your daily notes in a chronological timeline view.

## Features

- **Visual Timeline**: Display tasks from daily notes on a scrollable timeline with 24-hour segmentation
- **Task Parsing**: Automatically extracts tasks with timestamps from your daily notes
- **Date Range Controls**: Navigate between months or select custom date ranges
- **Interactive Tooltips**: Hover over task dots to see full task content and sub-items
- **Embedded Timelines**: Embed compact timelines directly in your notes using codeblocks
- **Tag-Based Styling**: Customize colors and emojis for different task tags
- **Smart Grouping**: Automatically group nearby tasks to reduce visual clutter
- **Zoom Controls**: Adjust timeline scale for better visibility
- **Native Obsidian Styling**: Uses Obsidian's native UI elements for seamless integration

## Installation

### Manual Installation

1. Copy `main.js`, `styles.css`, and `manifest.json` to your vault's plugins folder:
   ```
   YOUR_VAULT/.obsidian/plugins/daily-notes-timeline/
   ```

2. Reload Obsidian or enable the plugin in Settings → Community Plugins

## Usage

### Task Format

Tasks in your daily notes should follow this format:

```markdown
- [D] *07:30* Task content
- [A] *08:05* #log - [[Link]]
	- Entry description
	- More details
```

Where:
- `[D]`, `[A]`, etc. are task status indicators
- `*07:30*` is the timestamp (required)
- Task content follows the timestamp
- Sub-items are indented with a tab
- The first hashtag in a task determines its color/emoji styling

### Opening the Timeline View

- Click the calendar-clock icon in the ribbon, or
- Use the command palette: "Open Daily Notes Timeline"

The main timeline view provides:
- **Month Navigation**: Browse through your daily notes by month
- **Date Range Picker**: Select custom start and end dates
- **Zoom Slider**: Adjust the timeline scale for better visibility
- **Today/Reset Buttons**: Quickly navigate to today or reset to initial view

### Embedding Timelines in Notes

You can embed compact timelines directly in your notes using codeblocks. This is perfect for project pages, weekly reviews, or any note where you want to visualize tasks for a specific time period.

#### Basic Syntax

````markdown
```timeline
mode: month
startDate: 2025-10-01
```
````

#### Configuration Options

**Mode** (required)
- `mode: month` - Display a specific month
- `mode: custom` - Display a custom date range

**For Month Mode:**
- `startDate: YYYY-MM-DD` or `DD.MM.YYYY` - The month to display (any date within that month)

**For Custom Mode:**

Option 1 - Quick presets:
```daily-timeline
mode: custom
show: this-week
```

Available presets:
- `last-7` - Last 7 days
- `last-30` - Last 30 days
- `this-week` - Current week (Sunday-Saturday)
- `this-month` - Current month
- `last-3m` - Last 3 months

Option 2 - Explicit date range:
```daily-timeline
mode: custom
startDate: 2025-10-01
endDate: 2025-10-15
```

Date formats supported: `YYYY-MM-DD` or `DD.MM.YYYY`
Maximum range: 365 days

#### Embedded Timeline Controls

Embedded timelines include interactive controls:
- **View Mode Selector**: Switch between Month and Custom views
- **Month Picker**: Select any available month from your daily notes
- **Quick Range Presets**: Instantly jump to common date ranges (last 7 days, this week, etc.)
- **Date Pickers**: Set custom start and end dates
- **Zoom Controls**: Click icons to zoom in/out or drag the slider
- **Navigation**: Previous/Next buttons, Today button, and Reset button

#### Examples

Show the current month:
````markdown
```daily-timeline
mode: month
startDate: 2025-10-01
```
````

Show this week:
````markdown
```daily-timeline
mode: custom
show: this-week
```
````

Show a specific date range:
````markdown
```daily-timeline
mode: custom
startDate: 01.10.2025
endDate: 15.10.2025
```
````

Show the last 30 days:
````markdown
```daily-timeline
mode: custom
show: last-30
```
````

## Settings

Configure the plugin in Settings → Daily Notes Timeline:

### Basic Settings

- **Daily Notes Folder**: Path to your daily notes folder (leave empty for vault root or default daily notes location)
- **Date Format**: Format used in daily note filenames (e.g., YYYY-MM-DD, DD.MM.YYYY)
- **Default Timeline Range**: Number of months to display in the main timeline view (1-12 months)

### Tag Styles

Customize the appearance of timeline points based on the first hashtag in each task.

**Adding a Tag Style:**
1. Enter the tag name without the `#` symbol (e.g., `log` for `#log`, or `log/work` for `#log/work`)
2. Choose a color for the timeline point
3. Optionally add an emoji to display below the point
4. Click "Add Style"

**Examples:**
- Tag: `log`, Color: Blue, Emoji: 📝
- Tag: `meeting`, Color: Green, Emoji: 👥
- Tag: `idea`, Color: Yellow, Emoji: 💡

Tasks with `#log` will appear as blue dots with 📝 below them on the timeline.

### Points Grouping

Configure how timeline points are grouped when they appear close together. Grouping helps reduce visual clutter by combining nearby tasks into a single point with a count badge.

- **Enable Grouping**: Toggle to enable/disable automatic grouping of nearby tasks
- **Minimum Spacing**: Distance (in pixels) between tasks before they are grouped together (10-100px). Lower values create more groups.
- **Maximum Group Span**: Maximum distance (in pixels) between the first and last task in a group (30-150px). Prevents overly large groups.
- **Reset to Defaults**: Restore default grouping settings (Enabled, 25px spacing, 60px span)

## Development

### Building the Plugin

```bash
npm install
npm run build
```

### Development Mode

```bash
npm run dev
```

This will watch for changes and rebuild automatically.

## License

MIT
