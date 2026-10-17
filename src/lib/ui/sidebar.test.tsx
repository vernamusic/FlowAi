import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import {
  isMobileSidebarOpen,
  readSidebarCollapsed,
  setMobileSidebarOpen,
  sidebarAttribute,
  subscribeToSidebar,
  toggleSidebarCollapsed,
  writeSidebarCollapsed,
} from "@/lib/ui/sidebar";

const push = vi.fn();

/**
 * The top bar now reaches the router through the command palette, and
 * the sidebar needs the current path to mark where you are.
 */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/workflows",
}));

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute(sidebarAttribute);
  setMobileSidebarOpen(false);
});

describe("sidebar state", () => {
  it("defaults to collapsed", () => {
    expect(readSidebarCollapsed()).toBe(true);
  });

  it("remembers the choice", () => {
    writeSidebarCollapsed(false);

    expect(readSidebarCollapsed()).toBe(false);
    expect(window.localStorage.getItem("flowai:sidebar-collapsed")).toBe(
      "expanded",
    );
  });

  it("mirrors the choice onto the document for the width to follow", () => {
    writeSidebarCollapsed(false);
    expect(document.documentElement.getAttribute(sidebarAttribute)).toBe(
      "expanded",
    );

    writeSidebarCollapsed(true);
    expect(document.documentElement.getAttribute(sidebarAttribute)).toBe(
      "collapsed",
    );
  });

  it("toggles from whatever is stored", () => {
    toggleSidebarCollapsed();
    expect(readSidebarCollapsed()).toBe(false);

    toggleSidebarCollapsed();
    expect(readSidebarCollapsed()).toBe(true);
  });

  it("survives storage that refuses writes", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(
      () => {
        throw new Error("denied");
      },
    );

    expect(() => writeSidebarCollapsed(false)).not.toThrow();

    setItem.mockRestore();
  });

  it("notifies subscribers when the mobile sidebar opens", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSidebar(listener);

    setMobileSidebarOpen(true);

    expect(isMobileSidebarOpen()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setMobileSidebarOpen(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps the open sidebar out of storage", () => {
    setMobileSidebarOpen(true);

    expect(window.localStorage.length).toBe(0);
  });
});

describe("sidebar", () => {
  it("collapses and expands from the toggle", async () => {
    const user = userEvent.setup();

    render(<Sidebar />);

    /**
     * The label names what the button does next, and aria-expanded
     * reports where the sidebar currently is.
     */
    const expand = screen.getByRole("button", { name: "Expand sidebar" });

    expect(expand.getAttribute("aria-expanded")).toBe("false");

    await user.click(expand);

    const collapse = screen.getByRole("button", { name: "Collapse sidebar" });

    expect(collapse.getAttribute("aria-expanded")).toBe("true");
    expect(readSidebarCollapsed()).toBe(false);
  });

  it("hides labels when collapsed and shows them again", async () => {
    const user = userEvent.setup();

    render(<Sidebar />);

    const label = () => screen.getByText("Workflows");

    expect(label().className).toContain("opacity-0");

    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));

    expect(label().className).toContain("opacity-100");
  });

  it("always shows labels on a phone, where the sidebar is an overlay", async () => {
    const user = userEvent.setup();

    render(
      <>
        <Sidebar />
        <Topbar />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));

    expect(isMobileSidebarOpen()).toBe(true);
    expect(screen.getByText("Workflows").className).toContain("opacity-100");
  });

  it("closes the overlay again from the topbar", async () => {
    const user = userEvent.setup();

    render(
      <>
        <Sidebar />
        <Topbar />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("button", { name: "Close navigation" }));

    expect(isMobileSidebarOpen()).toBe(false);
    expect(
      screen.getByRole("button", { name: "Open navigation" }),
    ).toBeTruthy();
  });

  it("has no separate offset for the mobile button in the topbar", () => {
    render(<Topbar />);

    /**
     * The button used to float over the bar and be padded for, which is
     * why the header needed a magic number.
     */
    expect(
      screen.getByRole("button", { name: "Open navigation" }),
    ).toBeTruthy();
    expect(screen.getByText("My Workspace").className).not.toContain("pl-12");
  });
});