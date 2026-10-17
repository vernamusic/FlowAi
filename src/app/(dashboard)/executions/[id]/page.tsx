import { ExecutionDetail } from "@/components/executions/execution-detail";

export default async function ExecutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <section className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      <ExecutionDetail executionId={id} />
    </section>
  );
}