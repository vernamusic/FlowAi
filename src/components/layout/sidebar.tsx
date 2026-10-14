"use client";

import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Menu,
  Settings,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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
  },
  {
    label: "Templates",
    icon: Boxes,
  },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}{" "}
      {!mobileOpen && (
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          className=" fixed left-4 top-4 z-[60] flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 shadow-lg transition hover:border-zinc-700 hover:text-white lg:hidden "
        >
          {" "}
          <Menu className="h-4 w-4" />{" "}
        </button>
      )}
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="
            fixed inset-0 z-40
            bg-black/60
            lg:hidden
          "
        />
      )}
      {/* Sidebar */}
      <aside
        className={`
          group/sidebar
          fixed inset-y-0 left-0 z-50
          border-r border-zinc-800
          bg-zinc-950

          transition-all duration-200 ease-out

          ${mobileOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full"}

          lg:translate-x-0
          lg:w-16
          lg:hover:w-64
        `}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 shrink-0 items-center border-b border-zinc-800 px-3">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="
                flex h-10 min-w-0 flex-1
                items-center
                overflow-hidden
                rounded-lg
                px-2
                hover:bg-zinc-900
              "
            >
              {/* Logo */}
              <div className="flex shrink-0 items-center">
                {/* F */}
                <span className="text-lg font-semibold text-white">F</span>

                {/* lowAI */}
                <span
                  className={`
                    overflow-hidden
                    whitespace-nowrap
                    text-lg
                    font-semibold
                    text-white

                    transition-all
                    duration-200

                    ${
                      mobileOpen
                        ? "ml-0.5 max-w-[100px] opacity-100"
                        : "max-w-0 opacity-0"
                    }

                    lg:ml-0
                    lg:max-w-0
                    lg:opacity-0

                    lg:group-hover/sidebar:ml-0.5
                    lg:group-hover/sidebar:max-w-[100px]
                    lg:group-hover/sidebar:opacity-100
                  `}
                >
                  low<span className="text-violet-400">AI</span>
                </span>
              </div>
            </Link>

            {/* Close */}
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="
                flex h-8 w-8 shrink-0
                items-center justify-center
                rounded-lg
                text-zinc-500
                hover:bg-zinc-900
                hover:text-white
                lg:hidden
              "
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {navigation.map((item) => {
              const Icon = item.icon;

              const content = (
                <>
                  <div
                    className="
                      flex h-6 w-6 shrink-0
                      items-center justify-center
                    "
                  >
                    <Icon className="h-4 w-4 text-zinc-300" />
                  </div>

                  <span
                    className={`
                      ml-2 overflow-hidden whitespace-nowrap text-sm text-white
                      transition-all duration-200
                      ${
                        mobileOpen
                          ? "max-w-[160px] opacity-100"
                          : "max-w-0 opacity-0"
                      }
                      lg:max-w-0 lg:opacity-0
                      lg:group-hover/sidebar:max-w-[160px]
                      lg:group-hover/sidebar:opacity-100
                    `}
                  >
                    {item.label}
                  </span>
                </>
              );

              const className =
                "flex h-10 w-full items-center overflow-hidden rounded-lg px-2 text-white transition-colors hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";

              return item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={className}
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={item.label}
                  aria-disabled="true"
                  title={`${item.label} is coming soon`}
                  className={`${className} cursor-not-allowed opacity-45 hover:bg-transparent`}
                >
                  {content}
                </div>
              );
            })}
          </nav>

          {/* Settings */}
          <div className="shrink-0 border-t border-zinc-800 p-3">
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className="
                flex h-10 w-full
                items-center
                overflow-hidden
                rounded-lg
                px-2
                text-white
                hover:bg-zinc-900
              "
            >
              <div
                className="
                  flex h-6 w-6 shrink-0
                  items-center justify-center
                "
              >
                <Settings className="h-4 w-4 text-zinc-300" />
              </div>

              <span
                className={`
                  ml-2
                  overflow-hidden
                  whitespace-nowrap
                  text-sm
                  text-white

                  transition-all
                  duration-200

                  ${
                    mobileOpen
                      ? "max-w-[160px] opacity-100"
                      : "max-w-0 opacity-0"
                  }

                  lg:max-w-0
                  lg:opacity-0

                  lg:group-hover/sidebar:max-w-[160px]
                  lg:group-hover/sidebar:opacity-100
                `}
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
