import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/layout/toaster";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-dvh min-h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <Sidebar />

      <div className="app-content flex min-h-0 flex-1 flex-col transition-[padding] duration-200">
        <Topbar />

        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}
