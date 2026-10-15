"use client";

import { createContext, useCallback, useContext, useState } from "react";

type SearchModalContextValue = {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
};

const SearchModalContext = createContext<SearchModalContextValue | null>(null);

export function SearchModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  return (
    <SearchModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </SearchModalContext.Provider>
  );
}

export function useSearchModal() {
  const ctx = useContext(SearchModalContext);
  if (!ctx) throw new Error("useSearchModal must be used within SearchModalProvider");
  return ctx;
}
