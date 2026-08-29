import { NewWorkflowButton } from "@/components/workflow/new-workflow-button";
import { WorkflowList } from "@/components/workflow/workflow-list";

export default function WorkflowsPage() {
  return (
    <section className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

      <WorkflowList />
    </section>
  );
}
