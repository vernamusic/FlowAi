import { ExecutionsHistory } from "@/components/executions/executions-history";

export default function ExecutionsPage() {
  return (
    <section className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Activity</p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Executions
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Every run, with the tokens and cost each one used.
          </p>
        </div>
      </div>

      <ExecutionsHistory />
    </section>
  );
}