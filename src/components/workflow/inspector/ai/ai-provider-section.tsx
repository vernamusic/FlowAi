"use client";

import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import {
  getAiCredentials,
  getAiCredentialsServerSnapshot,
  setAiCredential,
  subscribeToAiCredentials,
} from "@/lib/workflow/execution/ai/credentials";
import {
  AI_PROVIDERS,
  getAiProvider,
  normalizeBaseUrl,
} from "@/lib/workflow/execution/ai/providers";
import { HelpTip } from "@/components/ui/help-tip";

interface AiProviderSectionProps {
  providerId: string;

  apiStyle: string;

  baseUrl: string;

  onChange: (patch: {
    providerId?: string;
    apiStyle?: string;
    baseUrl?: string;
  }) => void;
}

export function AiProviderSection({
  providerId,
  apiStyle,
  baseUrl,
  onChange,
}: AiProviderSectionProps) {
  const [showKey, setShowKey] = useState(false);
  const credentials = useSyncExternalStore(
    subscribeToAiCredentials,
    getAiCredentials,
    getAiCredentialsServerSnapshot,
  );

  const provider = getAiProvider(providerId);

  /**
   * Read the key through the resolved provider rather than the raw
   * config value. A node with no providerId configured stores an empty
   * string, so a lookup by that would come back blank while the field
   * beside it showed the key.
   */
  const credential = credentials[provider.id];
  const apiKey = credential?.apiKey ?? "";
  const isRemembered = credential?.remembered ?? false;
  const effectiveBaseUrl = normalizeBaseUrl(baseUrl) || provider.defaultBaseUrl;

  /**
   * Switching provider keeps the model only when the new host knows it,
   * otherwise the caller falls back to the provider default.
   */
  const handleProviderChange = (nextProviderId: string) => {
    onChange({ providerId: nextProviderId, baseUrl: "" });
  };

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium text-zinc-300">Provider</p>

        <p className="mt-1 text-[10px] leading-4 text-zinc-600">
          FlowAI talks to any OpenAI-compatible API. Keys are never written
          into a workflow or an export.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="ai-provider"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Provider
          </label>

          <HelpTip label="About providers" align="right">
            FlowAI speaks the OpenAI protocol, so any compatible host works.
            Keys live in this browser, never in the workflow or an export.
            They are forgotten when you close the tab unless you choose to
            remember them.
          </HelpTip>
        </div>

        <select
          id="ai-provider"
          value={provider.id}
          onChange={(event) => handleProviderChange(event.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
        >
          {AI_PROVIDERS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <p className="mt-2 text-[10px] leading-4 text-zinc-600">
          {provider.description}
        </p>
      </div>

      {/* Credentials */}

      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
        <div className="flex gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />

          <div>
            <p className="text-xs font-medium text-violet-100">
              {provider.keyLabel}
            </p>

            <p className="mt-1 text-[10px] leading-4 text-zinc-400">
              {provider.requiresApiKey
                ? "Used only in this browser. It is never saved in the workflow or an exported file."
                : "Optional for this provider. Never saved in the workflow or an exported file."}
            </p>
          </div>
        </div>

        <label htmlFor="ai-api-key" className="sr-only">
          {provider.keyLabel}
        </label>

        <div className="mt-3 flex overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 focus-within:border-violet-400">
          <KeyRound className="m-2.5 h-4 w-4 shrink-0 text-zinc-500" />

          <input
            id="ai-api-key"
            type={showKey ? "text" : "password"}
            value={credential?.apiKey ?? apiKey ?? ""}
            onChange={(event) =>
              setAiCredential(provider.id, { apiKey: event.target.value })
            }
            placeholder={provider.keyPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-700"
          />

          <button
            type="button"
            onClick={() => setShowKey((current) => !current)}
            aria-label={showKey ? "Hide API key" : "Show API key"}
            className="px-2 text-zinc-500 transition hover:text-zinc-200"
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        <label className="mt-3 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={isRemembered}
            onChange={(event) =>
              setAiCredential(provider.id, { remembered: event.target.checked })
            }
            className="mt-0.5 h-3.5 w-3.5 accent-violet-400"
          />

          <span className="text-[10px] leading-4 text-zinc-400">
            Remember this key on this device

            <span className="mt-0.5 block text-zinc-600">
              Off by default. Turning it on stores the key in this browser
              so it survives closing the tab, which also means any script on
              this site could read it. Clear it again from Settings, or turn
              this off.
            </span>
          </span>
        </label>

        <p
          className={`mt-2 text-[10px] ${
            apiKey
              ? isRemembered
                ? "text-violet-300"
                : "text-emerald-400"
              : "text-zinc-600"
          }`}
        >
          {apiKey
            ? isRemembered
              ? "Key remembered on this device"
              : "Key ready for this session only"
            : provider.requiresApiKey
              ? "Add a key to run this node"
              : "No key required"}
        </p>
      </div>

      {/* Endpoint */}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="ai-api-style"
            className="text-[11px] font-medium text-zinc-400"
          >
            API style
          </label>

          {provider.docsUrl && (
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-zinc-600 underline decoration-zinc-800 underline-offset-2 transition hover:text-zinc-400"
            >
              API docs
            </a>
          )}
        </div>

        <select
          id="ai-api-style"
          value={apiStyle}
          onChange={(event) => onChange({ apiStyle: event.target.value })}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
        >
          <option value="responses">Responses API</option>
          <option value="chat">Chat completions</option>
        </select>

        <p className="text-[10px] leading-4 text-zinc-600">
          {apiStyle === "responses"
            ? "POST {baseUrl}/responses — richer output and usage reporting."
            : "POST {baseUrl}/chat/completions — the widest compatibility."}
        </p>
      </div>

      {provider.supportsCustomBaseUrl && (
        <div>
          <label
            htmlFor="ai-base-url"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Base URL
          </label>

          <input
            id="ai-base-url"
            value={baseUrl}
            onChange={(event) => onChange({ baseUrl: event.target.value })}
            placeholder={
              provider.defaultBaseUrl || "https://api.example.com/v1"
            }
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-violet-400"
          />

          <p className="mt-2 text-[10px] leading-4 text-zinc-600">
            {provider.baseUrlHint ??
              "Include the API version segment. Saved with the workflow."}

            {effectiveBaseUrl ? ` Sending to ${effectiveBaseUrl}` : ""}
          </p>
        </div>
      )}
    </section>
  );
}