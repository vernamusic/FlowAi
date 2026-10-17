import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommandPalette } from "@/components/command-palette/command-palette";
import { setEditorCommands, type EditorCommands } from "@/lib/editor/editor-commands";
import { createWorkflow } from "@/lib/workflow/create-workflow";
import { saveWorkflow } from "@/lib/workflow/workflow-storage";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function editorCommands(): EditorCommands {
  return {
    addNode: vi.fn(),
    run: vi.fn(),
    dryRun: vi.fn(),
    save: vi.fn(),
    exportWorkflow: vi.fn(),
  };
}

async function open() {
  const user = userEvent.setup();

  await user.click(screen.getByRole("button", { name: /command palette/i }));

  return screen.findByRole("combobox");
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  setEditorCommands(null);
});

describe("command palette", () => {
  it("opens, filters, and runs a command", async () => {
    const commands = editorCommands();
    const onOpenShortcuts = vi.fn();

    setEditorCommands(commands);

    render(<CommandPalette onOpenShortcuts={onOpenShortcuts} />);

    const input = await open();

    await userEvent.setup().type(input, "dry run");

    const option = screen.getByRole("option", { name: /dry run/i });

    await userEvent.setup().click(option);

    expect(commands.dryRun).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("adds a node the editor asked for", async () => {
    const commands = editorCommands();

    setEditorCommands(commands);
    render(<CommandPalette onOpenShortcuts={vi.fn()} />);

    const user = userEvent.setup();
    const input = await open();

    await user.type(input, "webhook");

    await user.click(screen.getByRole("option", { name: /add webhook trigger/i }));

    expect(commands.addNode).toHaveBeenCalledWith("webhook-trigger");
  });

  it("offers editor commands only while the editor is open", async () => {
    const { unmount } = render(
      <CommandPalette onOpenShortcuts={vi.fn()} />,
    );

    setEditorCommands(editorCommands());

    await open();

    expect(screen.getByRole("option", { name: /add loop/i })).toBeTruthy();

    unmount();

    /**
     * Leaving the editor takes its commands out of the palette, so a
     * page that has no canvas never offers to add a node to it.
     */
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("moves through the list with the arrow keys", async () => {
    const commands = editorCommands();

    setEditorCommands(commands);
    render(<CommandPalette onOpenShortcuts={vi.fn()} />);

    const user = userEvent.setup();
    const input = await open();

    await user.type(input, "save");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(commands.save).toHaveBeenCalledTimes(1);
  });

  it("reaches the shortcut list", async () => {
    const onOpenShortcuts = vi.fn();

    render(<CommandPalette onOpenShortcuts={onOpenShortcuts} />);

    const user = userEvent.setup();
    const input = await open();

    await user.type(input, "shortcut");

    await user.click(screen.getByRole("option", { name: /keyboard shortcuts/i }));

    expect(onOpenShortcuts).toHaveBeenCalledTimes(1);
  });

  it("switches the theme", async () => {
    render(<CommandPalette onOpenShortcuts={vi.fn()} />);

    const user = userEvent.setup();
    const input = await open();

    await user.type(input, "light");

    await user.click(screen.getByRole("option", { name: /light theme/i }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("searches saved workflows and opens the chosen one", async () => {
    const workflow = {
      ...createWorkflow("Invoice summary"),
      nodes: [],
    };

    saveWorkflow(workflow);

    render(<CommandPalette onOpenShortcuts={vi.fn()} />);

    const user = userEvent.setup();
    const input = await open();

    await user.type(input, "invoice");

    const option = await screen.findByRole("option", {
      name: /invoice summary/i,
    });

    await user.click(option);

    expect(push).toHaveBeenCalledWith(`/workflows/${workflow.id}`);
  });

  it("says so when nothing matches", async () => {
    render(<CommandPalette onOpenShortcuts={vi.fn()} />);

    const user = userEvent.setup();
    const input = await open();

    await user.type(input, "postgres");

    expect(screen.getByText(/nothing matches/i)).toBeTruthy();
  });
});