import { Bot, GitBranch, Globe, Play } from "lucide-react";

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
    type: "http-request",

    label: "HTTP Request",

    description: "Send an HTTP request",

    category: "action",

    icon: Globe,
  },
];
