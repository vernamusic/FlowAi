import { Play, Search, Sun } from "lucide-react";
import { describe, expect, it } from "vitest";

import { filterCommands, type PaletteCommand } from "./palette-commands";

function command(overrides: Partial<PaletteCommand> = {}): PaletteCommand {
  return {
    id: "example",
    label: "Example",
    group: "Actions",
    icon: Play,
    run: () => undefined,
    ...overrides,
  };
}

const commands: PaletteCommand[] = [
  command({ id: "run", label: "Run workflow", keywords: "execute start" }),
  command({ id: "export", label: "Export workflow as JSON", keywords: "download backup" }),
  command({ id: "add-loop", label: "Add Loop", keywords: "repeat batch" }),
  command({ id: "theme-light", label: "Use the light theme", icon: Sun, keywords: "white appearance" }),
  command({ id: "go", label: "Go to Settings", icon: Search, keywords: "preferences" }),
];

describe("filterCommands", () => {
  it("keeps everything in order when nothing is typed", () => {
    expect(filterCommands(commands, "")).toEqual(commands);
    expect(filterCommands(commands, "   ")).toEqual(commands);
  });

  it("ignores case and surrounding spaces", () => {
    expect(filterCommands(commands, "  LOOP ").map((item) => item.id)).toEqual([
      "add-loop",
    ]);
  });

  it("puts a label that starts with the query first", () => {
    const results = filterCommands(commands, "run");

    expect(results[0].id).toBe("run");
  });

  it("finds commands through their keywords", () => {
    expect(filterCommands(commands, "batch").map((item) => item.id)).toEqual([
      "add-loop",
    ]);

    expect(filterCommands(commands, "backup").map((item) => item.id)).toEqual([
      "export",
    ]);
  });

  it("matches anywhere in a label", () => {
    expect(filterCommands(commands, "json").map((item) => item.id)).toEqual([
      "export",
    ]);
  });

  it("keeps the original order within the same score", () => {
    const results = filterCommands(commands, "workflow");

    expect(results.map((item) => item.id)).toEqual(["run", "export"]);
  });

  it("returns nothing when the query matches nothing", () => {
    expect(filterCommands(commands, "postgres")).toEqual([]);
  });
});