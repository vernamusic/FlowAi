import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkflowActions } from "@/components/workflow/workflow-actions";
import { LocalDataSettings } from "@/components/settings/local-data-settings";
import { NewWorkflowButton } from "@/components/workflow/new-workflow-button";
import { WorkflowList } from "@/components/workflow/workflow-list";
import { createWorkflow } from "@/lib/workflow/create-workflow";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import {
  WORKFLOW_FORMAT_VERSION,
  readWorkflowImport,
} from "@/lib/workflow/workflow-format";
import { getSavedWorkflows, saveWorkflow } from "@/lib/workflow/workflow-storage";
import { useWorkflowStore } from "@/store/workflow.store";

import type { Workflow } from "@/types/workflow";

const replace = vi.fn();
const push = vi.fn();
const routerReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: routerReplace }),
}));

function demoWorkflow(name = "Demo"): Workflow {
  const workflow = createWorkflow(name);

  return {
    ...workflow,
    nodes: [
      createWorkflowNode({ type: "manual-trigger", position: { x: 0, y: 0 } }),
      createWorkflowNode({ type: "output", position: { x: 300, y: 0 } }),
    ],
  };
}

beforeEach(() => {
  useWorkflowStore.getState().resetWorkflow();
  window.localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("creating a workflow", () => {
  it("creates a workflow and navigates to it", async () => {
    const user = userEvent.setup();

    render(<NewWorkflowButton />);
    await user.click(screen.getByRole("button", { name: /new workflow/i }));

    const created = useWorkflowStore.getState().workflow;

    expect(created).not.toBeNull();
    expect(created?.nodes).toEqual([]);
    expect(push).toHaveBeenCalledWith(`/workflows/${created?.id}`);
  });

  it("starts from a template when one is used", async () => {
    const user = userEvent.setup();
    const { TemplateGallery } = await import(
      "@/components/workflow/templates/template-gallery"
    );

    render(<TemplateGallery />);

    await user.click(
      screen.getAllByRole("button", { name: /use this template/i })[0],
    );

    const created = useWorkflowStore.getState().workflow;

    expect(created?.nodes.length).toBeGreaterThan(1);
    expect(getSavedWorkflows().map((item) => item.name)).toContain(created?.name);
    expect(push).toHaveBeenCalled();
  });
});

describe("saving a workflow", () => {
  it("writes the open workflow to storage", async () => {
    const user = userEvent.setup();
    const workflow = demoWorkflow();
    useWorkflowStore.getState().setWorkflow(workflow);

    render(<WorkflowActions workflowId={workflow.id} />);
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(getSavedWorkflows()).toHaveLength(1);
    expect(getSavedWorkflows()[0].name).toBe("Demo");
    expect(await screen.findByText("Saved")).toBeTruthy();
  });

  it("lists a saved workflow on the workflows page", async () => {
    saveWorkflow(demoWorkflow("Saved workflow"));

    render(<WorkflowList />);

    expect(await screen.findByText("Saved workflow")).toBeTruthy();
  });

  it("offers templates when there are no workflows", async () => {
    render(<WorkflowList />);

    expect(await screen.findByText("No workflows yet")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /use this template/i }).length)
      .toBeGreaterThan(0);
  });
});

describe("importing a workflow", () => {
  it("replaces the current workflow with a valid file", async () => {
    const user = userEvent.setup();
    useWorkflowStore.getState().setWorkflow(demoWorkflow("Before"));
    replace.mockClear();

    const file = new File([JSON.stringify(demoWorkflow("Imported"))], "flow.json", {
      type: "application/json",
    });

    render(<WorkflowActions workflowId="before" />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      expect(useWorkflowStore.getState().workflow?.name).toBe("Imported");
    });
  });

  it("shows an error for malformed json", async () => {
    const user = userEvent.setup();
    useWorkflowStore.getState().setWorkflow(demoWorkflow("Before"));

    const file = new File(["{ not json at all"], "broken.json", {
      type: "application/json",
    });

    render(<WorkflowActions workflowId="before" />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(useWorkflowStore.getState().workflow?.name).toBe("Before");
  });

  it("rejects a json file that is not a workflow", async () => {
    const user = userEvent.setup();
    useWorkflowStore.getState().setWorkflow(demoWorkflow("Before"));

    const file = new File([JSON.stringify({ hello: "world" })], "wrong.json", {
      type: "application/json",
    });

    render(<WorkflowActions workflowId="before" />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(useWorkflowStore.getState().workflow?.name).toBe("Before");
  });

  it("rejects a workflow with an unknown node type", async () => {
    const user = userEvent.setup();
    useWorkflowStore.getState().setWorkflow(demoWorkflow("Before"));

    const broken = demoWorkflow("Broken") as unknown as Record<string, unknown>;
    broken.nodes = [
      {
        id: "n1",
        type: "teleporter",
        position: { x: 0, y: 0 },
        data: { label: "X", description: "", category: "action", config: {} },
      },
    ];

    const file = new File([JSON.stringify(broken)], "broken.json", {
      type: "application/json",
    });

    render(<WorkflowActions workflowId="before" />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});

describe("exporting a workflow", () => {
  it("downloads the workflow as json", async () => {
    const user = userEvent.setup();
    const workflow = demoWorkflow("My Workflow");
    useWorkflowStore.getState().setWorkflow(workflow);

    const createObjectURL = vi.fn().mockReturnValue("blob:mock");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    const clicks: { download: string; href: string }[] = [];
    const originalClick = HTMLAnchorElement.prototype.click;

    HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
      clicks.push({ download: this.download, href: this.href });
    };

    render(<WorkflowActions workflowId={workflow.id} />);
    await user.click(screen.getByRole("button", { name: /export workflow/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clicks[0].download).toBe("My-Workflow.json");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");

    HTMLAnchorElement.prototype.click = originalClick;
  });

  it("exports the exact workflow that is open", async () => {
    const user = userEvent.setup();
    const workflow = demoWorkflow("Round Trip");
    useWorkflowStore.getState().setWorkflow(workflow);

    let exported = "";

    vi.stubGlobal("Blob", class extends Blob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        exported = String(parts[0]);
        super(parts, options);
      }
    });

    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: () => "blob:mock",
      revokeObjectURL: () => undefined,
    });

    HTMLAnchorElement.prototype.click = () => undefined;

    render(<WorkflowActions workflowId={workflow.id} />);
    await user.click(screen.getByRole("button", { name: /export workflow/i }));

    const parsed = JSON.parse(exported);

    /**
     * An export is a versioned envelope, not a bare workflow, so a newer
     * FlowAI knows what it is reading.
     */
    expect(parsed.kind).toBe("flowai-workflow");
    expect(parsed.version).toBe(WORKFLOW_FORMAT_VERSION);
    expect(parsed.workflow.name).toBe("Round Trip");
    expect(parsed.workflow.nodes).toHaveLength(2);

    /**
     * And it reads back as the workflow that was open.
     */
    expect(readWorkflowImport(parsed).workflow?.nodes).toHaveLength(2);

    vi.unstubAllGlobals();
  });
});

describe("resetting local data", () => {
  it("clears stored workflows after confirmation", async () => {
    const user = userEvent.setup();
    saveWorkflow(demoWorkflow("Doomed"));
    saveWorkflow(demoWorkflow("Also doomed"));

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<LocalDataSettings />);

    await user.click(screen.getByRole("button", { name: /reset|delete/i }));

    await waitFor(() => {
      expect(getSavedWorkflows()).toEqual([]);
    });

    confirmSpy.mockRestore();
  });

  it("keeps the data when the confirmation is declined", async () => {
    const user = userEvent.setup();
    saveWorkflow(demoWorkflow("Safe"));

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<LocalDataSettings />);
    await user.click(screen.getByRole("button", { name: /reset|delete/i }));

    expect(getSavedWorkflows()).toHaveLength(1);

    confirmSpy.mockRestore();
  });
});

describe("deleting a workflow", () => {
  it("removes the workflow and returns to the list", async () => {
    const user = userEvent.setup();
    const workflow = demoWorkflow("Doomed");
    saveWorkflow(workflow);
    useWorkflowStore.getState().setWorkflow(workflow);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<WorkflowActions workflowId={workflow.id} />);
    await user.click(screen.getByRole("button", { name: /delete workflow/i }));

    expect(getSavedWorkflows()).toEqual([]);
    expect(routerReplace).toHaveBeenCalledWith("/workflows");

    confirmSpy.mockRestore();
  });

  it("keeps the workflow when the confirmation is declined", async () => {
    const user = userEvent.setup();
    const workflow = demoWorkflow("Safe");
    saveWorkflow(workflow);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<WorkflowActions workflowId={workflow.id} />);
    await user.click(screen.getByRole("button", { name: /delete workflow/i }));

    expect(getSavedWorkflows()).toHaveLength(1);

    confirmSpy.mockRestore();
  });
});

describe("corrupted storage in the browser", () => {
  it("renders the list instead of crashing", async () => {
    window.localStorage.setItem("flowai:workflows", "{ this is broken");

    render(<WorkflowList />);

    expect(await screen.findByText("No workflows yet")).toBeTruthy();
  });

  it("surfaces a recovery notice to the user", async () => {
    window.localStorage.setItem("flowai:workflows", "{ this is broken");

    render(<LocalDataSettings />);

    expect(
      await screen.findByText(/repaired|recovered|recover/i),
    ).toBeTruthy();
  });

  it("keeps working after corrupted data is replaced", async () => {
    window.localStorage.setItem("flowai:workflows", "{ this is broken");

    render(<WorkflowList />);
    await screen.findByText("No workflows yet");

    saveWorkflow(demoWorkflow("Fresh start"));

    render(<WorkflowList />);

    expect(await screen.findByText("Fresh start")).toBeTruthy();
  });
});