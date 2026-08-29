import { WorkflowEditor } from "@/components/workflow/editor/workflow-editor";
import { WorkflowActions } from "@/components/workflow/workflow-actions";
import { WorkflowNameInput } from "@/components/workflow/workflow-name-input";

interface WorkflowPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { id } = await params;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {/* Workflow Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500">Workflow</p>

          <WorkflowNameInput workflowId={id} />
        </div>

        <WorkflowActions workflowId={id} />
      </div>

      {/* Editor */}
      <div className="min-h-0 flex-1">
        <WorkflowEditor workflowId={id} />
      </div>
    </div>
  );
}
