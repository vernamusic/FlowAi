import { MarkerType } from "@xyflow/react";
import { describe, expect, it } from "vitest";

import { defaultEdgeColor, getEdgePresentation } from "@/constants/edges";
import { workflowEdgeToReactFlowEdge } from "@/lib/workflow/react-flow-adapter";
import type { WorkflowEdge } from "@/types/workflow";

function edge(overrides: Partial<WorkflowEdge> = {}): WorkflowEdge {
  return {
    id: "edge-1",
    source: "node-a",
    target: "node-b",
    sourceHandle: undefined,
    targetHandle: undefined,
    ...overrides,
  };
}

describe("getEdgePresentation", () => {
  it("treats a plain connection as an ordinary edge", () => {
    const presentation = getEdgePresentation(edge());

    expect(presentation.isBranch).toBe(false);
    expect(presentation.label).toBeUndefined();
    expect(presentation.stroke).toBe(defaultEdgeColor);
  });

  it.each([
    ["true", "True", "#34d399"],
    ["false", "False", "#f87171"],
    ["body", "Body", "#a78bfa"],
    ["after", "After", "#38bdf8"],
  ])("labels and colours the %s branch", (handle, label, stroke) => {
    const presentation = getEdgePresentation(edge({ sourceHandle: handle }));

    expect(presentation).toMatchObject({ isBranch: true, label, stroke });
  });

  it("falls back for an unknown handle instead of inventing a colour", () => {
    const presentation = getEdgePresentation(edge({ sourceHandle: "nope" }));

    expect(presentation.isBranch).toBe(false);
    expect(presentation.stroke).toBe(defaultEdgeColor);
  });
});

describe("workflowEdgeToReactFlowEdge", () => {
  it("draws a directed, angled edge with a wide hit area", () => {
    const result = workflowEdgeToReactFlowEdge(edge());

    expect(result.type).toBe("smoothstep");
    expect(result.markerEnd).toMatchObject({ type: MarkerType.ArrowClosed });
    expect(result.interactionWidth).toBeGreaterThanOrEqual(20);
    expect(result.selectable).toBe(true);
  });

  it("keeps the workflow identity intact", () => {
    const result = workflowEdgeToReactFlowEdge(
      edge({ sourceHandle: "body", targetHandle: "in" }),
    );

    expect(result).toMatchObject({
      id: "edge-1",
      source: "node-a",
      target: "node-b",
      sourceHandle: "body",
      targetHandle: "in",
    });
  });

  it("animates only while the source node is running", () => {
    expect(workflowEdgeToReactFlowEdge(edge()).animated).toBe(false);
    expect(
      workflowEdgeToReactFlowEdge(edge(), { sourceStatus: "success" }).animated,
    ).toBe(false);
    expect(
      workflowEdgeToReactFlowEdge(edge(), { sourceStatus: "running" }).animated,
    ).toBe(true);
  });

  it("emphasises the edge that is hovered or selected", () => {
    const resting = workflowEdgeToReactFlowEdge(edge());
    const hovered = workflowEdgeToReactFlowEdge(edge(), { isHovered: true });
    const selected = workflowEdgeToReactFlowEdge(edge(), { isSelected: true });

    expect(resting.style?.strokeWidth).toBe(2);
    expect(hovered.style?.strokeWidth).toBe(3);
    expect(selected.style?.strokeWidth).toBe(3);
    expect(selected.selected).toBe(true);
  });

  it("labels the branch on the edge and in the arrowhead", () => {
    const result = workflowEdgeToReactFlowEdge(
      edge({ sourceHandle: "false" }),
      { sourceStatus: "running" },
    );

    expect(result.label).toBe("False");
    expect(result.labelStyle?.fill).toBe("#f87171");
    expect(result.markerEnd).toMatchObject({ color: "#f87171" });
  });

  it("does not label plain connections", () => {
    expect(workflowEdgeToReactFlowEdge(edge()).label).toBeUndefined();
  });
});