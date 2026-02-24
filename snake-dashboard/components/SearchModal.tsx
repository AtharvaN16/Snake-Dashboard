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
        className="fixed inset-0 z-[100] bg-black/40"
        aria-hidden
        onClick={closeModal}
      />
      <div
        className={
          isPhylogeny
            ? "fixed left-1/2 top-1/2 z-[101] w-[calc(100%-32px)] max-w-2xl h-[70vh] max-h-[70vh] lg:h-auto lg:max-h-[80vh] -translate-x-1/2 -translate-y-1/2"
            : "fixed left-1/2 top-1/2 z-[101] w-[calc(100%-32px)] max-w-2xl h-[70vh] max-h-[80vh] lg:h-auto lg:max-h-[80vh] -translate-x-1/2 -translate-y-1/2"
        }
        role="dialog"
        aria-modal="true"
        aria-label="Search snakes"
      >
        <HomeSearchCard
          inputId={MODAL_SEARCH_INPUT_ID}
          onSelectSnake={closeModal}
          getSnakeHref={getSnakeHref}
          className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        />
      </div>
    </>
  );
}
