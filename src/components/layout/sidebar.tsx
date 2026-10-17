"use client";

import {
  BarChart3,
  Boxes,
  ChevronLeft,
  LayoutDashboard,
  Settings,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import {
  isMobileSidebarOpen,
  readSidebarCollapsed,
  setMobileSidebarOpen,
  subscribeToSidebar,
  toggleSidebarCollapsed,
} from "@/lib/ui/sidebar";

const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    label: "Workflows",
    icon: Workflow,
    href: "/workflows",
  },
  {
    label: "Executions",
    icon: BarChart3,
    href: "/executions",
  },
  {
    label: "Templates",
    icon: Boxes,
    href: "/templates",
  },
];

function getCollapsed() {
  return readSidebarCollapsed();
}

function getMobileOpen() {
  return isMobileSidebarOpen();
}

/**
 * Labels fade rather than disappear, which is what makes the rail feel
 * like a rail instead of a layout shift.
 */
function labelClass(visible: boolean) {
  return [
    "overflow-hidden whitespace-nowrap transition-all duration-200",
    visible ? "ml-2 max-w-[160px] opacity-100" : "ml-0 max-w-0 opacity-0",
  ].join(" ");
}

export function Sidebar() {
  const pathname = usePathname();

  const isCollapsed = useSyncExternalStore(
    subscribeToSidebar,
    getCollapsed,
    () => true,
  );

  const mobileOpen = useSyncExternalStore(
    subscribeToSidebar,
    getMobileOpen,
    () => false,
  );

  /**
   * On a phone the sidebar is an overlay that is either there or not, so
   * it is always full width and always labelled.
   */
  const showLabels = mobileOpen || !isCollapsed;

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={[
          "app-sidebar",
          "fixed inset-y-0 left-0 z-50",
          "border-r border-zinc-800 bg-zinc-950",
          "transition-[width,transform] duration-200 ease-out",
          "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 shrink-0 items-center gap-1 border-b border-zinc-800 px-3">
            <Link
              href="/"
              onClick={() => setMobileSidebarOpen(false)}
              className="flex h-10 min-w-0 flex-1 items-center rounded-lg px-2 hover:bg-zinc-900"
              title="FlowAI"
            >
              <span className="shrink-0 text-lg font-semibold text-white">
                F
              </span>

              <span
                className={`overflow-hidden whitespace-nowrap text-lg font-semibold text-white transition-all duration-200 ${
                  showLabels ? "ml-0.5 max-w-[100px] opacity-100" : "ml-0 max-w-0 opacity-0"
                }`}
              >
                low<span className="text-violet-400">AI</span>
              </span>
            </Link>

            {/* Close, on a phone */}
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileSidebarOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-900 hover:text-white lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>

            {/**
             * Collapse is a desktop affordance: on a phone the sidebar is
             * already out of the way.
             */}
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!isCollapsed}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-900 hover:text-white lg:flex"
            >
              <ChevronLeft
                className={`h-4 w-4 transition-transform duration-200 ${
                  isCollapsed ? "" : "rotate-180"
                }`}
              />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  title={showLabels ? undefined : item.label}
                  className={`flex h-10 w-full items-center overflow-hidden rounded-lg px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                    <Icon
                      className={`h-4 w-4 ${isActive ? "text-violet-300" : "text-zinc-300"}`}
                    />
                  </div>

                  <span
                    className={`text-sm ${isActive ? "text-white" : "text-zinc-300"} ${labelClass(showLabels)}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Settings */}
          <div className="shrink-0 border-t border-zinc-800 p-3">
            <Link
              href="/settings"
              onClick={() => setMobileSidebarOpen(false)}
              className="flex h-10 w-full items-center overflow-hidden rounded-lg px-2 text-white hover:bg-zinc-900"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                <Settings className="h-4 w-4 text-zinc-300" />
              </div>

              <span
                className={`text-sm text-white ${labelClass(showLabels)}`}
                title={showLabels ? undefined : "Settings"}
              >
                Settings
              </span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}