import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />

      <div className="ml-64 flex min-w-0 flex-1 flex-col">
        <Topbar />

        <main className="flex min-h-0 flex-1 flex-col p-6">{children}</main>
      </div>
    </div>
  );
}
