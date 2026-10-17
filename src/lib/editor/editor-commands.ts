import type { NodeType } from "@/types/workflow";

/**
 * The actions only the editor can perform.
 *
 * The palette is rendered by the top bar on every page, but "add a node"
 * or "run" mean nothing until an editor is open. Rather than teaching the
 * palette about routing, the editor registers what it can do and the
 * palette reads that.
 */
export interface EditorCommands {
  addNode: (type: NodeType) => void;

  run: () => void;

  dryRun: () => void;

  save: () => void;

  exportWorkflow: () => void;
}

let commands: EditorCommands | null = null;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Called by the editor as it mounts and unmounts. Passing null is what
 * takes the editor commands back out of the palette.
 */
export function setEditorCommands(next: EditorCommands | null) {
  commands = next;
  notify();
}

export function getEditorCommands(): EditorCommands | null {
  return commands;
}

export function subscribeToEditorCommands(callback: () => void) {
  listeners.add(callback);

  return () => {
    listeners.delete(callback);
  };
}