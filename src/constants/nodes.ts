import {
  Bell,
  Bot,
  Braces,
  Calculator,
  Clock,
  GitBranch,
  GitMerge,
  Globe,
  ListTree,
  PanelsTopLeft,
  Play,
  RefreshCw,
  Repeat,
  Type,
  Webhook,
} from "lucide-react";

import type { NodeCategory, NodeType } from "@/types/workflow";

export interface NodeDefinition {
  type: NodeType;

  label: string;

  description: string;

  category: NodeCategory;

  icon: typeof Play;
}

export const NODE_DEFINITIONS: NodeDefinition[] = [
  {
    type: "manual-trigger",

    label: "Manual Trigger",

    description: "Start workflow manually",

    category: "trigger",

    icon: Play,
  },

  {
    type: "webhook-trigger",

    label: "Webhook Trigger",

    description: "Simulate an incoming webhook payload",

    category: "trigger",

    icon: Webhook,
  },

  {
    type: "page-load-trigger",

    label: "Page Load Trigger",

    description: "Run when you open this workflow",

    category: "trigger",

    icon: PanelsTopLeft,
  },

  {
    type: "interval-trigger",

    label: "Interval Trigger",

    description: "Run again every few minutes",

    category: "trigger",

    icon: RefreshCw,
  },

  {
    type: "ai-prompt",

    label: "AI Prompt",

    description: "Send a prompt to an AI model",

    category: "ai",

    icon: Bot,
  },

  {
    type: "condition",

    label: "Condition",

    description: "Branch workflow based on a condition",

    category: "logic",

    icon: GitBranch,
  },

  {
    type: "switch",

    label: "Switch",

    description: "Route to the first case that matches",

    category: "logic",

    icon: ListTree,
  },

  {
    type: "merge",

    label: "Merge",

    description: "Combine what several branches produced",

    category: "logic",

    icon: GitMerge,
  },

  {
    type: "math",

    label: "Math",

    description: "Calculate a number from an expression",

    category: "logic",

    icon: Calculator,
  },

  {
    type: "text",

    label: "Text",

    description: "Clean up, join, or format text",

    category: "logic",

    icon: Type,
  },

  {
    type: "transform",

    label: "Set Variable",

    description: "Build a value from templates",

    category: "logic",

    icon: Braces,
  },

  {
    type: "json-parser",

    label: "JSON Parser",

    description: "Parse JSON and pick a path",

    category: "logic",

    icon: Braces,
  },

  {
    type: "loop",

    label: "Loop",

    description: "Repeat downstream nodes per item",

    category: "logic",

    icon: Repeat,
  },

  {
    type: "http-request",

    label: "HTTP Request",

    description: "Send an HTTP request",

    category: "action",

    icon: Globe,
  },

  {
    type: "delay",

    label: "Delay",

    description: "Wait before continuing",

    category: "action",

    icon: Clock,
  },

  {
    type: "output",

    label: "Output",

    description: "Log a message and notify",

    category: "action",

    icon: Bell,
  },
];