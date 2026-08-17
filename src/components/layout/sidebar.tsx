import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Settings,
  Workflow,
} from "lucide-react";
import Link from "next/link";

const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Workflows",
    icon: Workflow,
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
  return (
    <aside className="fixed inset-y-0 left-0 w-64 border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-zinc-800 px-6">
          <h1 className="text-xl font-semibold tracking-tight">
            Flow<span className="text-violet-400">AI</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={
                  item.label === "Dashboard"
                    ? "/"
                    : item.label === "Workflows"
                      ? "/workflows"
                      : "#"
                }
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100">
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>
    </aside>
  );
}
