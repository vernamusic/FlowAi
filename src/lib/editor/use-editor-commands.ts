"use client";

import { useEffect } from "react";

import {
  setEditorCommands,
  type EditorCommands,
} from "@/lib/editor/editor-commands";

/**
 * Publishes the editor's actions to the command palette for as long as
 * the editor is on screen.
 */
export function useEditorCommands(commands: EditorCommands) {
  const { addNode, run, dryRun, save, exportWorkflow } = commands;

  useEffect(() => {
    setEditorCommands({ addNode, run, dryRun, save, exportWorkflow });

    return () => setEditorCommands(null);
  }, [addNode, dryRun, exportWorkflow, run, save]);
}