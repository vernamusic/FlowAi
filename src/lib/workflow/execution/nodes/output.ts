import { pushToast } from "@/store/toast.store";

export type OutputLevel = "info" | "success" | "warning" | "error";

export type OutputChannel = "log" | "toast" | "both";

export interface OutputConfig {
  level: OutputLevel;

  channel: OutputChannel;

  /** Template string, already resolved by the engine. */
  message: string;
}

export const OUTPUT_LEVELS: {
  value: OutputLevel;
  label: string;
}[] = [
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
];

export const OUTPUT_CHANNELS: {
  value: OutputChannel;
  label: string;
  description: string;
}[] = [
  { value: "log", label: "Execution log", description: "Record it in the log only." },
  { value: "toast", label: "In-app notification", description: "Show a notification only." },
  { value: "both", label: "Log and notify", description: "Record it and show a notification." },
];

export function readOutputConfig(
  raw: Record<string, unknown> | undefined,
): OutputConfig {
  const config = raw ?? {};

  return {
    level: OUTPUT_LEVELS.some((item) => item.value === config.level)
      ? (config.level as OutputLevel)
      : "info",
    channel: OUTPUT_CHANNELS.some((item) => item.value === config.channel)
      ? (config.channel as OutputChannel)
      : "both",
    message: typeof config.message === "string" ? config.message : "",
  };
}

export interface Notification {
  level: OutputLevel;

  message: string;
}

/**
 * Deliver a message to the execution log and, when asked for, as an
 * in-app notification.
 */
export function executeOutput(
  config: OutputConfig,
  options: { dryRun?: boolean } = {},
): Record<string, unknown> {
  const message = config.message.trim() || "Workflow reached the output node.";

  if (options.dryRun) {
    return {
      message,
      level: config.level,
      channel: config.channel,
      delivered: false,
      dryRun: true,
    };
  }

  const notified = config.channel !== "log";

  if (notified) {
    pushToast({ level: config.level, message });
  }

  return {
    message,
    level: config.level,
    channel: config.channel,
    delivered: notified,
  };
}