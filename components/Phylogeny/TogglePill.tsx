"use client";

interface TogglePillProps {
  label: string;
  active: boolean;
  onChange: (active: boolean) => void;
}

export function TogglePill({ label, active, onChange }: TogglePillProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={
        "inline-flex items-center px-4 py-2 text-sm font-medium rounded-full transition-colors " +
        (active
          ? "bg-stone-800 text-white shadow-sm"
          : "bg-white/80 text-stone-600 hover:text-stone-800 border border-stone-200/50 backdrop-blur-sm")
      }
    >
      {label}
    </button>
  );
}
