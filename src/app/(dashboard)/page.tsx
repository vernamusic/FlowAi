export default function DashboardPage() {
  return (
    <section>
      <div>
        <p className="text-sm text-zinc-500">Overview</p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Build, manage and run your AI workflows.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-sm text-zinc-500">Workflows</p>
          <p className="mt-2 text-3xl font-semibold">0</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-sm text-zinc-500">Executions</p>
          <p className="mt-2 text-3xl font-semibold">0</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-sm text-zinc-500">Success Rate</p>
          <p className="mt-2 text-3xl font-semibold">—</p>
        </div>
      </div>
    </section>
  );
}
