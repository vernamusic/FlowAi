import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getSavedWorkflow,
  getSavedWorkflows,
  getWorkflowStorageStatus,
  resetSavedWorkflows,
  saveWorkflow,
  subscribeToWorkflowStorage,
  workflowStorageSchemaVersion,
} from "@/lib/workflow/workflow-storage";
import { createWorkflow } from "@/lib/workflow/create-workflow";
import { createWorkflowNode } from "@/lib/workflow/create-node";

import type { Workflow } from "@/types/workflow";

const storageKey = "flowai:workflows";
const recoveryPrefix = "flowai:workflows-recovery:";

function sampleWorkflow(name: string): Workflow {
  const workflow = createWorkflow(name);

  return {
    ...workflow,
    nodes: [createWorkflowNode({ type: "manual-trigger", position: { x: 0, y: 0 } })],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function writeStorage(value: unknown) {
  window.localStorage.setItem(
    storageKey,
    typeof value === "string" ? value : JSON.stringify(value),
  );
}

/**
 * Storage keys in insertion order.
 *
 * The suite installs an in-memory Storage, so keys come from `keys()`
 * rather than from property enumeration.
 */
function storageKeys(): string[] {
  const storage = window.localStorage as Storage & { keys?: () => string[] };

  return typeof storage.keys === "function" ? storage.keys() : Object.keys(storage);
}

function recoveryKeys() {
  return storageKeys().filter((key) => key.startsWith(recoveryPrefix));
}

/**
 * Every test starts from empty storage, because the module keeps the
 * previous status in memory.
 */
beforeEach(() => {
  window.localStorage.clear();
  resetSavedWorkflows();
  window.localStorage.clear();
});

describe("round trip", () => {
  it("saves and reads a workflow back", () => {
    const workflow = sampleWorkflow("Saved");

    saveWorkflow(workflow);

    expect(getSavedWorkflow(workflow.id)).toEqual(workflow);
    expect(getSavedWorkflows()).toHaveLength(1);
  });

  it("updates an existing workflow instead of duplicating it", () => {
    const workflow = sampleWorkflow("Saved");

    saveWorkflow(workflow);
    saveWorkflow({ ...workflow, name: "Renamed" });

    const saved = getSavedWorkflows();

    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Renamed");
  });

  it("keeps other workflows when one is updated", () => {
    const first = sampleWorkflow("First");
    const second = sampleWorkflow("Second");

    saveWorkflow(first);
    saveWorkflow(second);
    saveWorkflow({ ...first, name: "First updated" });

    expect(getSavedWorkflows().map((item) => item.name).sort()).toEqual([
      "First updated",
      "Second",
    ]);
  });

  it("returns the most recently updated workflow first", () => {
    const older = { ...sampleWorkflow("Older"), updatedAt: "2026-01-01T00:00:00.000Z" };
    const newer = { ...sampleWorkflow("Newer"), updatedAt: "2026-06-01T00:00:00.000Z" };

    saveWorkflow(older);
    saveWorkflow(newer);

    expect(getSavedWorkflows()[0].name).toBe("Newer");
  });

  it("returns null for an unknown id", () => {
    expect(getSavedWorkflow("does-not-exist")).toBeNull();
  });

  it("clears everything on reset", () => {
    saveWorkflow(sampleWorkflow("One"));
    saveWorkflow(sampleWorkflow("Two"));

    resetSavedWorkflows();

    expect(getSavedWorkflows()).toEqual([]);
  });

  it("notifies subscribers when data changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToWorkflowStorage(listener);

    saveWorkflow(sampleWorkflow("One"));

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    saveWorkflow(sampleWorkflow("Two"));

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("migration", () => {
  it("migrates the legacy bare array format", () => {
    const workflow = sampleWorkflow("Legacy");
    writeStorage([workflow]);

    const saved = getSavedWorkflows();

    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Legacy");

    const envelope = JSON.parse(
      window.localStorage.getItem(storageKey) as string,
    );

    expect(envelope.version).toBe(workflowStorageSchemaVersion);
    expect(Array.isArray(envelope.workflows)).toBe(true);
    expect(getWorkflowStorageStatus().recovered).toBe(true);
  });

  it("keeps a backup of the legacy data before rewriting it", () => {
    writeStorage([sampleWorkflow("Legacy")]);

    getSavedWorkflows();

    const backups = recoveryKeys();

    expect(backups).toHaveLength(1);
    expect(
      JSON.parse(window.localStorage.getItem(backups[0]) as string),
    ).toHaveLength(1);
  });

  it("migrates an envelope from an older version", () => {
    writeStorage({
      version: 1,
      savedAt: "2025-01-01T00:00:00.000Z",
      workflows: [sampleWorkflow("Old version")],
    });

    expect(getSavedWorkflows()[0].name).toBe("Old version");

    const envelope = JSON.parse(
      window.localStorage.getItem(storageKey) as string,
    );

    expect(envelope.version).toBe(workflowStorageSchemaVersion);
    expect(envelope.recoveredAt).toBeTruthy();
  });

  it("does not migrate data that is already current", () => {
    saveWorkflow(sampleWorkflow("Current"));
    const before = window.localStorage.getItem(storageKey);

    getSavedWorkflows();

    expect(window.localStorage.getItem(storageKey)).toBe(before);
    expect(recoveryKeys()).toHaveLength(0);
    expect(getWorkflowStorageStatus().recovered).toBe(false);
  });

  it("drops entries that do not look like workflows", () => {
    const good = sampleWorkflow("Good");

    writeStorage({
      version: workflowStorageSchemaVersion,
      savedAt: new Date().toISOString(),
      workflows: [
        good,
        { id: "broken" },
        null,
        "not a workflow",
        { ...good, id: "missing-nodes", nodes: undefined },
      ],
    });

    const saved = getSavedWorkflows();

    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Good");
    expect(recoveryKeys()).toHaveLength(1);
    expect(getWorkflowStorageStatus().recovered).toBe(true);
  });
});

describe("corrupted storage", () => {
  it("survives malformed JSON", () => {
    writeStorage("{ this is not json");

    expect(getSavedWorkflows()).toEqual([]);
    expect(recoveryKeys()).toHaveLength(1);
    expect(getWorkflowStorageStatus().recovered).toBe(true);
  });

  it("recovers after malformed JSON is repaired", () => {
    writeStorage("{ broken");
    getSavedWorkflows();

    saveWorkflow(sampleWorkflow("Repaired"));

    expect(getSavedWorkflows().map((item) => item.name)).toEqual(["Repaired"]);
  });

  it("survives a JSON value that is not an envelope", () => {
    writeStorage({ hello: "world" });

    expect(getSavedWorkflows()).toEqual([]);
    expect(recoveryKeys()).toHaveLength(1);
  });

  it("survives a JSON string instead of an object", () => {
    writeStorage('"just a string"');

    expect(getSavedWorkflows()).toEqual([]);
    expect(recoveryKeys()).toHaveLength(1);
  });

  it("survives null", () => {
    writeStorage("null");

    expect(getSavedWorkflows()).toEqual([]);
    expect(recoveryKeys()).toHaveLength(1);
  });

  it("survives an envelope whose workflows field is not an array", () => {
    writeStorage({ version: 2, savedAt: "x", workflows: { nope: true } });

    expect(getSavedWorkflows()).toEqual([]);
    expect(recoveryKeys()).toHaveLength(1);
  });

  it("survives an empty string", () => {
    window.localStorage.setItem(storageKey, "");

    expect(getSavedWorkflows()).toEqual([]);
    expect(recoveryKeys()).toHaveLength(0);
  });

  it("keeps working when writes fail", () => {
    const setItem = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      });

    expect(() => saveWorkflow(sampleWorkflow("Too big"))).toThrow();

    setItem.mockRestore();

    expect(getSavedWorkflows()).toEqual([]);
  });

  it("does not leave a backup when there is nothing to recover", () => {
    writeStorage("");
    getSavedWorkflows();

    expect(recoveryKeys()).toHaveLength(0);
  });
});

describe("storage status", () => {
  it("reports the last save time", () => {
    saveWorkflow(sampleWorkflow("One"));

    expect(getWorkflowStorageStatus().savedAt).toBeTruthy();
    expect(getWorkflowStorageStatus().recovered).toBe(false);
  });

  it("reports an empty store without pretending it saved", () => {
    window.localStorage.clear();

    expect(getWorkflowStorageStatus().savedAt).toBeNull();
  });
});