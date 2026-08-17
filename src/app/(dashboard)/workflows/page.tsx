import { NewWorkflowButton } from "@/components/workflow/new-workflow-button";

export default function WorkflowsPage() {
  return (
    <section>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500">Automation</p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Workflows
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Create and manage your AI workflows.
          </p>
        </div>

        <NewWorkflowButton />
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-zinc-800 p-12 text-center">
        <p className="text-sm text-zinc-500">No workflows yet.</p>

        <p className="mt-1 text-sm text-zinc-600">
          Create your first workflow to get started.
        </p>
      </div>
    </section>
  );
}
