import { EditorSkeleton } from "@/components/workflow/editor/workflow-not-found";

export default function WorkflowLoading() {
  return (
    <div className="h-full w-full">
      <EditorSkeleton />
    </div>
  );
}