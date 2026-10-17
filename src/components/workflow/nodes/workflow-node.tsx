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

import {
  DEFAULT_SWITCH_HANDLE,
  readSwitchConfig,
  switchHandles,
} from "@/lib/workflow/execution/nodes/switch";

import type {
  NodeExecutionStatus,
  NodeType,
  WorkflowNodeData,
} from "@/types/workflow";

const icons = {
  trigger: Play,
  ai: Bot,
  logic: GitBranch,
  action: Globe,
};

/**
 * Switch cases are numbered by the user, so they get their own colours
 * rather than the two a condition has.
 *
 * Written out in full because Tailwind only generates the classes it can
 * find spelled out in the source.
 */
const caseHandleClasses = [
  "!bg-sky-400",
  "!bg-violet-400",
  "!bg-emerald-400",
  "!bg-amber-400",
  "!bg-rose-400",
  "!bg-cyan-400",
];

const caseDotClasses = [
  "bg-sky-400",
  "bg-violet-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-cyan-400",
];

export function WorkflowNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData & {
    type?: NodeType;
    executionStatus?: NodeExecutionStatus;
  };

  const Icon = icons[nodeData.category] ?? Globe;

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

  /**
   * Only conditions branch into named outputs, and triggers start a
   * workflow so they never accept an incoming connection.
   */
  const isCondition = nodeData.type === "condition";
  const isTrigger = nodeData.category === "trigger";
  const isLoop = nodeData.type === "loop";
  const isSwitch = nodeData.type === "switch";

  /**
   * A switch draws a handle per case, which only exist once the cases
   * do, so they are read from the same place the engine reads them.
   */
  const switchHandlesForNode = isSwitch
    ? switchHandles(readSwitchConfig(nodeData.config ?? {}))
    : [];

  return (
    <div
      className={`
        w-64
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

      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2 !w-2 !border-0 !bg-zinc-500"
        />
      )}

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
        {isSwitch ? (
          <ul className="space-y-1">
            {switchHandlesForNode.map((handle, index) => (
              <li
                key={handle.id}
                className="flex items-center gap-2 text-[10px] text-zinc-500"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    handle.id === DEFAULT_SWITCH_HANDLE
                      ? "bg-zinc-600"
                      : caseDotClasses[index % caseDotClasses.length]
                  }`}
                />

                <span className="truncate">{handle.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-5 text-zinc-500">
            {nodeData.description}
          </p>
        )}

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

      {!isCondition && !isLoop && !isSwitch && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-2 !w-2 !border-0 !bg-zinc-500"
        />
      )}

      {isSwitch &&
        switchHandlesForNode.map((handle, index) => (
          <Handle
            key={handle.id}
            id={handle.id}
            type="source"
            position={Position.Right}
            style={{ top: handle.top }}
            className={`!h-2.5 !w-2.5 !border-0 ${
              handle.id === DEFAULT_SWITCH_HANDLE
                ? "!bg-zinc-500"
                : caseHandleClasses[index % caseHandleClasses.length]
            }`}
          />
        ))}

      {isLoop && (
        <>
          <Handle
            id="body"
            type="source"
            position={Position.Bottom}
            className="!h-2.5 !w-2.5 !border-0 !bg-violet-400"
          />

          <Handle
            id="after"
            type="source"
            position={Position.Right}
            style={{ top: "35%" }}
            className="!h-2.5 !w-2.5 !border-0 !bg-violet-400"
          />

          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-medium text-violet-400">
            Body
          </span>

          <span className="absolute right-2 top-[35%] translate-y-[-50%] text-[9px] font-medium text-violet-400">
            After
          </span>
        </>
      )}

      {isCondition && (
        <>
          {/**
           * Both branches leave from the right, one above the other, so a
           * condition reads the same way as every other left to right
           * step instead of doubling back on itself.
           */}
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            style={{ top: "30%" }}
            className="!h-2.5 !w-2.5 !border-0 !bg-emerald-400"
          />

          <Handle
            id="false"
            type="source"
            position={Position.Right}
            style={{ top: "70%" }}
            className="!h-2.5 !w-2.5 !border-0 !bg-red-400"
          />

          <span className="absolute right-2 top-[30%] translate-y-[-50%] text-[9px] font-medium text-emerald-400">
            True
          </span>

          <span className="absolute right-2 top-[70%] translate-y-[-50%] text-[9px] font-medium text-red-400">
            False
          </span>
        </>
      )}
    </div>
  );
}
