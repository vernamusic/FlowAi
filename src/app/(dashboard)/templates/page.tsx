import { TemplateGallery } from "@/components/workflow/templates/template-gallery";

export default function TemplatesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">
            Automation
          </p>

          <h1 className="mt-1 text-xl font-semibold text-white">Templates</h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Start from a working workflow instead of an empty canvas. Every
            template is fully wired, so you can run it immediately and then
            make it yours.
          </p>
        </div>
      </header>

      <div className="mt-8">
        <TemplateGallery />
      </div>

      <p className="mt-8 text-xs leading-6 text-zinc-600">
        Templates live in this browser. Using one creates a new workflow you
        can rename, edit, export, or delete like any other.
      </p>
    </div>
  );
}