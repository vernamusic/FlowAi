"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import {
  Bot,
  Check,
  Circle,
  GitBranch,
  Globe,
  Loader2,
  Play,
  X,
} from "lucide-react";

import type { NodeExecutionStatus, WorkflowNodeData } from "@/types/workflow";

const icons = {
  trigger: Play,
  ai: Bot,
  logic: GitBranch,
  action: Globe,
};

export function WorkflowNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData & {
    executionStatus?: NodeExecutionStatus;
  };

  const Icon = icons[nodeData.category];

  const executionStatus = nodeData.executionStatus;

  const getStatusIcon = () => {
    switch (executionStatus) {
      case "running":
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />;

      case "success":
        return <Check className="h-3.5 w-3.5 text-emerald-400" />;

      case "error":
        return <X className="h-3.5 w-3.5 text-red-400" />;

      default:
        return <Circle className="h-3.5 w-3.5 text-zinc-700" />;
    }
  };

  const getStatusText = () => {
    switch (executionStatus) {
      case "running":
        return "Running...";

      case "success":
        return "Completed";

      case "error":
        return "Failed";

      default:
        return null;
    }
  };

  const statusText = getStatusText();

  return (
    <div
      className={`
        min-w-64
        overflow-hidden
        rounded-xl
        border
        bg-zinc-950
        shadow-xl
        transition-all
        ${selected ? "border-blue-500 shadow-blue-500/10" : "border-zinc-800"}

        ${
          executionStatus === "running"
            ? "border-blue-500/70 shadow-blue-500/20"
            : ""
        }

        ${executionStatus === "success" ? "border-emerald-500/40" : ""}

        ${executionStatus === "error" ? "border-red-500/50" : ""}
      `}
    >
      {/* Target Handle */}

      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-zinc-500"
      />

      {/* Header */}

      <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900">
          <Icon className="h-4 w-4 text-zinc-300" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {nodeData.label}
          </p>

          <p className="text-[11px] capitalize text-zinc-500">
            {nodeData.category}
          </p>
        </div>

        {/* Execution Status */}

        {executionStatus && executionStatus !== "pending" && (
          <div className="shrink-0">{getStatusIcon()}</div>
        )}
      </div>

      {/* Body */}

      <div className="px-4 py-3">
        <p className="text-xs leading-5 text-zinc-500">
          {nodeData.description}
        </p>

        {/* Execution Status */}

        {statusText && (
          <div className="mt-3 flex items-center gap-2 border-t border-zinc-900 pt-3">
            {getStatusIcon()}

            <span
              className={`
                text-[10px] font-medium
                ${executionStatus === "running" ? "text-blue-400" : ""}
                ${executionStatus === "success" ? "text-emerald-400" : ""}
                ${executionStatus === "error" ? "text-red-400" : ""}
              `}
            >
              {statusText}
            </span>
          </div>
        )}
      </div>

      {/* Source Handle */}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-0 !bg-zinc-500"
      />
    </div>
  );
}
