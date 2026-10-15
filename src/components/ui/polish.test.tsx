import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ShortcutsDialog } from "@/components/ui/shortcuts-dialog";
import { Toaster } from "@/components/layout/toaster";
import { EditorSkeleton, WorkflowNotFound } from "@/components/workflow/editor/workflow-not-found";
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  writeThemePreference,
} from "@/lib/theme/theme";
import { isTypingTarget } from "@/lib/shortcuts/shortcuts";
import { useToastStore } from "@/store/toast.store";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  useToastStore.getState().clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("theme", () => {
  it("stores and reads the preference", () => {
    writeThemePreference("light");

    expect(readThemePreference()).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("falls back to system for an unknown stored value", () => {
    window.localStorage.setItem("flowai:theme", "neon");

    expect(readThemePreference()).toBe("system");
  });

  it("resolves the system preference through the media query", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true }),
    );

    expect(resolveTheme("system")).toBe("light");

    writeThemePreference("dark");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("cycles through the preferences", async () => {
    const user = userEvent.setup();

    render(<ThemeToggle />);

    const toggle = screen.getByRole("button", { name: /theme/i });

    expect(toggle.getAttribute("data-theme-value")).toBe("system");

    await user.click(toggle);
    expect(toggle.getAttribute("data-theme-value")).toBe("light");

    await user.click(toggle);
    expect(toggle.getAttribute("data-theme-value")).toBe("dark");
  });

  it("applies the palette to the document", () => {
    applyTheme("light");

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});

describe("keyboard shortcut help", () => {
  it("opens from the button and lists the shortcuts", async () => {
    const user = userEvent.setup();

    render(<ShortcutsDialog />);

    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: /keyboard shortcuts/i }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Undo the last change")).toBeTruthy();
    expect(screen.getByText("Duplicate the selected node")).toBeTruthy();
  });

  it("opens with the question mark key", async () => {
    const user = userEvent.setup();

    render(<ShortcutsDialog />);

    await user.keyboard("?");

    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  });

  it("closes on Escape and returns focus", async () => {
    const user = userEvent.setup();

    render(<ShortcutsDialog />);

    const trigger = screen.getByRole("button", { name: /keyboard shortcuts/i });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("does not fire while typing", () => {
    const input = document.createElement("input");
    document.body.append(input);

    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(document.body)).toBe(false);

    input.remove();
  });
});

describe("editor states", () => {
  it("announces that it is loading", () => {
    render(<EditorSkeleton />);

    expect(screen.getByRole("status").textContent).toBe("Loading workflow");
  });

  it("explains a missing workflow instead of loading forever", async () => {
    const user = userEvent.setup();

    render(<WorkflowNotFound workflowId="missing-id" />);

    await waitFor(() =>
      expect(screen.getByText("Workflow not found")).toBeTruthy(),
    );

    expect(screen.getByText("missing-id")).toBeTruthy();
    expect(screen.getByRole("link", { name: /back to workflows/i })).toBeTruthy();

    // Nothing should keep announcing a loading state.
    expect(screen.queryByText("Loading workflow")).toBeNull();

    await user.click(screen.getByRole("link", { name: /back to workflows/i }));
  });
});

describe("notifications", () => {
  it("exposes notifications to assistive technology", () => {
    useToastStore.getState().push({ level: "error", message: "Something broke" });

    render(<Toaster />);

    const alert = screen.getByRole("alert");

    expect(alert.textContent).toContain("Something broke");
  });

  it("uses a polite live region for informational notifications", () => {
    useToastStore.getState().push({ level: "info", message: "Heads up" });

    render(<Toaster />);

    expect(screen.getByRole("status").textContent).toContain("Heads up");
  });

  it("can be dismissed", async () => {
    const user = userEvent.setup();

    useToastStore.getState().push({ level: "info", message: "Dismiss me" });

    render(<Toaster />);

    await user.click(screen.getByRole("button", { name: /dismiss notification/i }));

    expect(screen.queryByText("Dismiss me")).toBeNull();
  });
});