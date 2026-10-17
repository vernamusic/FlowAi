/**
 * Sidebar state.
 *
 * Two independent things live here:
 *
 * - whether the sidebar is collapsed on desktop, which is remembered
 *   between visits
 * - whether it is open over the content on a phone, which is not
 *
 * The module owns both so the sidebar and the topbar can read and change
 * them without either one owning the other.
 */

const storageKey = "flowai:sidebar-collapsed";

/**
 * Applied to the document element, so the width is right before the
 * first paint instead of jumping once React loads.
 */
export const sidebarAttribute = "data-sidebar";

/** A narrow rail: icons only. */
const collapsedSidebar = "collapsed";

/** Icons and labels. */
const expandedSidebar = "expanded";

let mobileOpen = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readSidebarCollapsed(): boolean {
  if (!canUseStorage()) return true;

  try {
    /**
     * Absent means the default, which is a collapsed rail.
     */
    return window.localStorage.getItem(storageKey) !== "expanded";
  } catch {
    return true;
  }
}

export function writeSidebarCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(storageKey, collapsed ? "collapsed" : "expanded");
  } catch {
    /**
     * Private browsing can refuse writes, in which case the preference
     * simply resets next time.
     */
  }

  applySidebarCollapsed(collapsed);
  notify();
}

/**
 * Keeps CSS in step with the stored value. Safe to call on the server:
 * it simply does nothing.
 */
export function applySidebarCollapsed(collapsed: boolean) {
  if (typeof document === "undefined") return;

  document.documentElement.setAttribute(
    sidebarAttribute,
    collapsed ? collapsedSidebar : expandedSidebar,
  );
}

export function setMobileSidebarOpen(open: boolean) {
  if (mobileOpen === open) return;

  mobileOpen = open;
  notify();
}

export function toggleSidebarCollapsed() {
  writeSidebarCollapsed(!readSidebarCollapsed());
}

export function isMobileSidebarOpen(): boolean {
  return mobileOpen;
}

export function toggleMobileSidebar() {
  setMobileSidebarOpen(!mobileOpen);
}

export function subscribeToSidebar(callback: () => void) {
  listeners.add(callback);

  return () => {
    listeners.delete(callback);
  };
}

/**
 * Inline script that applies the stored width before the first paint, so
 * the page never opens with the wrong sidebar and then slides.
 */
export const sidebarScript = `
(function () {
  try {
    var stored = localStorage.getItem("${storageKey}");
    document.documentElement.setAttribute(
      "${sidebarAttribute}",
      stored === "expanded" ? "expanded" : "collapsed"
    );
  } catch (error) {}
})();
`;