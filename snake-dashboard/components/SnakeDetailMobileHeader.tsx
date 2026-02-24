"use client";

import Link from "next/link";
import { useSearchModal } from "@/contexts/SearchModalContext";

export function SnakeDetailMobileHeader() {
  const { openModal } = useSearchModal();

  return (
    <div className="fixed left-2 top-2 z-40 flex items-center gap-2 lg:hidden">
      <Link
        href="/"
        className="inline-flex items-center rounded-md bg-white/75 px-2 py-1 text-sm text-stone-700 shadow-sm backdrop-blur-sm transition-colors hover:text-stone-900"
      >
        Back
      </Link>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center rounded-md bg-white/75 px-2 py-1 text-sm text-stone-700 shadow-sm backdrop-blur-sm transition-colors hover:text-stone-900"
      >
        Search
      </button>
    </div>
  );
}

