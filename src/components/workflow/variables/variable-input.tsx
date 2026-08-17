"use client";

import { useEffect, useRef, useState } from "react";

import type { WorkflowVariable } from "@/types/workflow";

import { VariablePicker } from "./variable-picker";

interface VariableInputProps {
  value: string;
  variables: WorkflowVariable[];
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function VariableInput({
  value,
  variables,
  onChange,
  placeholder,
  rows = 5,
}: VariableInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showPicker, setShowPicker] = useState(false);

  const [search, setSearch] = useState("");

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const cursor = textarea.selectionStart;

    const textBeforeCursor = value.slice(0, cursor);

    const match = textBeforeCursor.match(/\{\{\s*([a-zA-Z0-9_.]*)$/);

    if (match) {
      setShowPicker(true);
      setSearch(match[1] ?? "");
    } else {
      setShowPicker(false);
      setSearch("");
    }
  }, [value]);

  const filteredVariables = variables.filter((variable) => {
    if (!search) {
      return true;
    }

    const query = search.toLowerCase();

    return (
      variable.path.toLowerCase().includes(query) ||
      variable.key.toLowerCase().includes(query) ||
      variable.nodeLabel.toLowerCase().includes(query)
    );
  });

  const handleSelect = (variable: WorkflowVariable) => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const cursor = textarea.selectionStart;

    const textBeforeCursor = value.slice(0, cursor);

    const textAfterCursor = value.slice(cursor);

    const match = textBeforeCursor.match(/\{\{\s*[a-zA-Z0-9_.]*$/);

    if (!match) {
      return;
    }

    const start = textBeforeCursor.length - match[0].length;

    const variableText = `{{${variable.key}}}`;

    const nextValue = value.slice(0, start) + variableText + textAfterCursor;

    onChange(nextValue);

    setShowPicker(false);
    setSearch("");

    requestAnimationFrame(() => {
      const nextCursor = start + variableText.length;

      textarea.focus();

      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          setTimeout(() => {
            setShowPicker(false);
          }, 150);
        }}
        className="
          w-full
          resize-none
          rounded-lg
          border
          border-zinc-800
          bg-zinc-900
          px-3
          py-2.5
          text-xs
          leading-5
          text-zinc-200
          outline-none
          placeholder:text-zinc-700
          focus:border-zinc-600
        "
      />

      {showPicker && (
        <VariablePicker variables={filteredVariables} onSelect={handleSelect} />
      )}
    </div>
  );
}
