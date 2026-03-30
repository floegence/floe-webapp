# Picker Path Semantics

Floe picker components intentionally operate with two different path domains:

- internal picker path:
  - rooted at `/`
  - relative to `homePath` when `homePath` is provided
  - examples:
    - `/`
    - `/Downloads/code/floe-webapp`
- absolute display / filesystem path:
  - real host path shown to users or sent to downstream file APIs
  - examples:
    - `/Users/demo`
    - `/Users/demo/Downloads/code/floe-webapp`

## Contract

- `DirectoryPicker`, `FileSavePicker`, and `DirectoryInput` keep picker state in the internal-path domain.
- `homePath` is the bridge between internal paths and absolute display paths.
- `initialPath` may be provided as an absolute path by downstream callers, but picker state canonicalizes it into the internal-path domain before selection state is stored.
- callbacks that leave the picker boundary should convert back into the caller's expected path domain explicitly.

## Why this matters

If an absolute path is stored directly as picker-internal state while `homePath` is also set, display conversion can prepend `homePath` a second time and create duplicated prefixes such as:

- `/Users/demo/Users/demo/project`

To avoid that class of bug:

- normalize `initialPath` against `homePath` before consuming it as picker state
- treat `initialPath` as reactive input instead of a mount-time snapshot
- keep absolute-path conversion at the boundary helpers, not inside selection state
