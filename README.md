# Daily Notes Timeline - Obsidian Plugin

A plugin for Obsidian that visualizes tasks from your daily notes in a chronological timeline view.

## Features

- **Visual Timeline**: Display tasks from daily notes on a scrollable timeline with 24-hour segmentation
- **Task Parsing**: Automatically extracts tasks with timestamps from your daily notes
- **Date Range Controls**: Navigate between months or select custom date ranges
- **Interactive Tooltips**: Hover over task dots to see full task content and sub-items
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

### Opening the Timeline

- Click the calendar-clock icon in the ribbon, or
- Use the command palette: "Open Daily Notes Timeline"

### Settings

Configure the plugin in Settings → Daily Notes Timeline:
- **Daily Notes Folder**: Path to your daily notes (leave empty for vault root)
- **Date Format**: Format used in filenames (default: YYYY-MM-DD)
- **Default Timeline Range**: Number of months to display (1-12)

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
