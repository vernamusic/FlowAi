export interface ShortcutGroup {
  title: string;

  shortcuts: { keys: string[]; description: string }[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Editing",
    shortcuts: [
      { keys: ["Ctrl", "Z"], description: "Undo the last change" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Redo" },
      { keys: ["Ctrl", "Y"], description: "Redo" },
      { keys: ["Ctrl", "D"], description: "Duplicate the selected node" },
      { keys: ["Delete"], description: "Remove the selected node or connection" },
      { keys: ["Escape"], description: "Deselect the node" },
    ],
  },
  {
    title: "Canvas",
    shortcuts: [
      { keys: ["Space"], description: "Hold to pan, even from over a node" },
    ],
  },
  {
    title: "Workflow",
    shortcuts: [
      { keys: ["Ctrl", "S"], description: "Save the workflow" },
      { keys: ["Ctrl", "Enter"], description: "Run the workflow" },
    ],
  },
  {
    title: "Everywhere",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "Open the command palette" },
      { keys: ["?"], description: "Open the shortcut list" },
      { keys: ["Esc"], description: "Close a dialog or clear the selection" },
    ],
  },
];

/**
 * True when the event target is somewhere the user is typing, where
 * editor shortcuts must not fire.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;

  if (!element) {
    return false;
  }

  return Boolean(
    element.closest(
      "input, textarea, select, [contenteditable='true'], [data-allow-shortcuts='false']",
    ),
  );
}

/**
 * True on macOS, where the same shortcuts are usually shown with ⌘.
 */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}