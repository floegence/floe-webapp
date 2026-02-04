// Core public entrypoint (kernel).
//
// Keep this file lightweight so downstream apps can selectively opt into
// heavier modules (e.g. chat/file-browser) via explicit subpath exports.

// Provider/runtime (keep minimal; do not export FloeApp here).
export { FloeProvider, type FloeProviderProps } from './app/FloeProvider';

// Context providers
export * from './context';

// Hooks
export * from './hooks';

// Utilities
export * from './utils';

// Theme system
export * from './styles/themes';
