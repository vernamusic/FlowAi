import Link from "next/link";

export default function WorkflowNotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-24 text-center">
      <h1 className="text-xl font-semibold text-white">Workflow not found</h1>

      <p className="mt-2 text-sm leading-6 text-zinc-500">
        This workflow is not stored in this browser. It may have been deleted,
        or the link may belong to another device.
      </p>

      <Link
        href="/workflows"
        className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-400"
      >
        Back to workflows
      </Link>
    </div>
  );
}