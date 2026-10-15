"use client";

import { HelpCircle } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface HelpTipProps {
  /** Short explanation shown in the popover. */
  children: ReactNode;

  label?: string;

  align?: "left" | "right";
}

/**
 * Small contextual help bubble.
 *
 * Click or keyboard opens it, Escape or an outside click closes it.
 */
export function HelpTip({
  children,
  label = "Help",
  align = "left",
}: HelpTipProps) {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("click", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? id : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
        className="flex h-4 w-4 items-center justify-center rounded-full text-zinc-700 transition hover:text-zinc-400"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <span
          id={id}
          role="tooltip"
          className={`absolute top-6 z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-left text-[10px] font-normal leading-4 text-zinc-400 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </span>
      )}
    </span>
  );
}