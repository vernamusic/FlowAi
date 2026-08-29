"use client";

import { ReactFlowProvider } from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { NodeLibrary } from "@/components/workflow/sidebar/node-library";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowInspector } from "@/components/workflow/inspector/workflow-inspector";

export function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <div className="flex h-full min-h-0 w-full">
        <NodeLibrary />

        <main className="min-h-0 min-w-0 flex-1">
          <WorkflowCanvas />
        </main>

        <WorkflowInspector />
      </div>
    </ReactFlowProvider>
  );
}
