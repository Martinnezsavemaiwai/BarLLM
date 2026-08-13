# BarLLM

![BarLLM Logo](src-tauri/icons/icon.png)

> Windows Taskbar Companion for AI Coding Assistants. Your AI coding usage, always one glance away.

BarLLM is a native-feeling Windows 11 system tray companion designed to help you monitor your usage for AI coding assistants (e.g. Claude Code, Codex, Aider) directly from the taskbar, without opening settings or web dashboards.

## Features

- **Native Windows 11 Experience**: Minimalist, fast, and elegantly designed using Segoe UI and Framer Motion.
- **Taskbar Badge**: Provides a quick glance at your current usage status via a dynamic tray icon.
- **Hover Panel**: Hover over the tray icon to see a quick progress ring of your usage.
- **Click Panel**: A detailed flyout with 24-hour usage history, remaining credits, and quick navigation.
- **Smart Notifications**: Native Windows notifications when your usage reaches critical thresholds (60%, 80%, 90%, 100%).
- **Provider Architecture**: Built to be extensible. Currently focused on Claude Code, with future support planned for Codex, OpenCode, and more.

## Installation

You can build and run BarLLM from source using Tauri.

### Prerequisites
- Node.js (v18+)
- Rust (v1.75+)
- Visual Studio Build Tools (for Windows)

### Build Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/Martinnezsavemaiwai/BarLLM.git
   cd BarLLM
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run tauri dev
   ```

4. Build for production:
   ```bash
   npm run tauri build
   ```

## Development

BarLLM comes with a built-in "Dev Mode" layout that lets you manually simulate usage thresholds (0% to 100%) to see how the UI reacts. Run `npm run dev` to see the web UI, or `npm run tauri dev` to test the full Windows tray integration.

## Architecture

BarLLM follows a strict **Provider-based Architecture**. 
The React frontend is fully decoupled from the usage data sources. All providers (e.g., `ClaudeProvider`) must implement the `Provider` interface and return a normalized `UsageSnapshot`.

```typescript
export interface Provider {
  id: string;
  name: string;
  icon: string;
  getUsage(): Promise<UsageSnapshot>;
}
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to add a new provider or submit pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
