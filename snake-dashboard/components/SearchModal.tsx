"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSearchModal } from "@/contexts/SearchModalContext";
import { HomeSearchCard } from "@/components/HomeSearchCard";

const MODAL_SEARCH_INPUT_ID = "search-modal-input";

export function SearchModal() {
  const pathname = usePathname();
  const { isOpen, closeModal } = useSearchModal();
  const isPhylogeny = pathname === "/phylogeny";
  const getSnakeHref = isPhylogeny
    ? (snake: { id: string }) => `/phylogeny?snakeId=${snake.id}`
    : undefined;

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        document.getElementById(MODAL_SEARCH_INPUT_ID)?.focus();
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[100]"
        aria-hidden
        onClick={closeModal}
      />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-2xl h-[85vh] mx-4"
        role="dialog"
        aria-modal="true"
        aria-label="Search snakes"
      >
        <HomeSearchCard
          inputId={MODAL_SEARCH_INPUT_ID}
          onSelectSnake={closeModal}
          getSnakeHref={getSnakeHref}
          className="h-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
        />
      </div>
    </>
  );
}
