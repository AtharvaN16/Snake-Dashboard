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
          const searchEl = document.getElementById(MAIN_SEARCH_INPUT_ID);
          if (searchEl) searchEl.focus();
        } else {
          openModal();
        }
        return;
      }

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        router.push("/rank");
        return;
      }

      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        router.push("/phylogeny");
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathname, router, isOpen, openModal, closeModal]);

  return null;
}
