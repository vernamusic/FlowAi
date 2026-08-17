import { WorkflowEditor } from "@/components/workflow/editor/workflow-editor";
import { RunWorkflowButton } from "@/lib/workflow/execution/run-workflow-button";

interface WorkflowPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { id } = await params;

  return (
    <div className="-m-6">
      <div className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
        <div>
          <p className="text-xs text-zinc-500">Workflow</p>

          <h1 className="text-sm font-medium">{id}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900">
            Save
          </button>

          <RunWorkflowButton />
        </div>
      </div>

      <WorkflowEditor />
    </div>
  );
}
