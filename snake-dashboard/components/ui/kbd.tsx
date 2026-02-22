"use client";

import { type ComponentPropsWithoutRef } from "react";

/**
 * Keyboard key indicator. Style matches snake info page and is standardized across the site.
 * When triggerKey is set, clicking the indicator dispatches that key so global handlers run.
 */
const kbdClass =
  "px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 font-mono shadow-sm cursor-default";

const kbdButtonClass = kbdClass + " cursor-pointer hover:bg-stone-300 transition-colors";

function dispatchKey(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

export function Kbd({
  className = "",
  triggerKey,
  ...props
}: ComponentPropsWithoutRef<"kbd"> & { triggerKey?: string }) {
  const resolvedClass = (triggerKey ? kbdButtonClass : kbdClass) + " " + className.trim();
  if (triggerKey != null) {
    return (
      <button
        type="button"
        className={resolvedClass}
        onClick={() => dispatchKey(triggerKey)}
        aria-label={props["aria-label"] ?? `Press ${triggerKey === " " ? "Space" : triggerKey}`}
      >
        {props.children}
      </button>
    );
  }
  return <kbd className={resolvedClass} {...props} />;
}
