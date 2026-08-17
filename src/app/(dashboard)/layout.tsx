import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />

      <div className="ml-64">
        <Topbar />

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
