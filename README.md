# Sidebar Schedule for Obsidian

A vertical, scrollable calendar view that syncs with local macOS calendars (Apple Calendar). Google Calendar support coming soon.

[!["Buy Me A Coffee"](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=GJdybxNt6&button_colour=FFDD00&font_colour=000000&font_family=Poppins&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/GJdybxNt6)

## Features

- 📅 Vertical, scrollable calendar view
- 🔄 Sync with local macOS calendars (Apple Calendar) - Google Calendar support coming soon
- 📱 Desktop-only support (macOS)

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Sidebar Schedule"
4. Click Install

### Manual Installation

1. Download the latest release from GitHub
2. Extract the files to your vault's `.obsidian/plugins/sidebar-schedule/` directory
3. Reload Obsidian

## Requirements

- Obsidian 1.0.0 or higher
- macOS (desktop only)

## Usage

1. Open the command palette (Cmd+P)
2. Type "Sidebar Schedule: Open Schedule View"
3. Configure your calendar sources in Settings

## Development

```bash
# Install dependencies
bun install

# Build the plugin
bun run build

# Build the native Swift component
bun run build:swift

# Development mode with watch
bun run dev
```

## Building from Source

1. Clone this repository
2. Run `bun install` to install dependencies
3. Run `bun run build:swift` to build the native calendar bridge
4. Run `bun run build` to build the plugin
5. Copy the `main.js`, `manifest.json`, `styles.css`, and `calendar-bridge` files to your vault's `.obsidian/plugins/sidebar-schedule/` directory

## License

MIT

## Support

For issues and feature requests, please visit the [GitHub repository](https://github.com/yourusername/obsidian-schedule).
