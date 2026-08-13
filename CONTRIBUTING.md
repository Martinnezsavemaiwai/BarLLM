# Contributing to BarLLM

Thank you for your interest in contributing to BarLLM! 

## Adding a New Provider

BarLLM is designed to be extensible. To add a new AI coding assistant provider:

1. Create a new class implementing the `Provider` interface in `src/providers/your-provider.ts`.
2. Do **not** put API logic in the React UI components. All parsing, fetching, and normalizing must happen inside your provider class.
3. Ensure that your provider gracefully degrades (e.g. throws `FileNotFoundError`) if the user doesn't have the CLI tool installed.
4. Update `App.tsx` (in the future, the Settings panel) to allow switching to your provider.

## Development Rules

- **Strict TypeScript**: No `any` types.
- **Design System**: Use the CSS variables defined in `src/styles/index.css`. Do not hardcode new colors unless you are adding a completely new semantic state.
- **No Web Bloat**: The goal is a native Windows 11 feel. Avoid complex web-only UI patterns. Keep it minimal and fast.

Please open an issue before submitting large PRs so we can discuss the architectural approach.
