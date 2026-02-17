"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSearchModal } from "@/contexts/SearchModalContext";

const MAIN_SEARCH_INPUT_ID = "main-search";

export function KeyboardShortcuts() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, openModal, closeModal } = useSearchModal();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isOpen) {
          e.preventDefault();
          closeModal();
        } else if (pathname !== "/") {
          e.preventDefault();
          router.push("/");
        }
        return;
      }

      // Don't trigger when user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        if (pathname === "/") {
          // On home: focus the inline search
          const searchEl = document.getElementById(MAIN_SEARCH_INPUT_ID);
          if (searchEl) searchEl.focus();
        } else {
          // On detail pages: open search modal to look up another snake
          openModal();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathname, router, isOpen, openModal, closeModal]);

  return null;
}
