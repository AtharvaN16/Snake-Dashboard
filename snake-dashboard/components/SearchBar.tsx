"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  /** Optional id for the input (e.g. for keyboard shortcut focus) */
  inputId?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

export function SearchBar({ 
  onSearch, 
  placeholder = "Search for venomous snakes...",
  className,
  inputId,
  onKeyDown,
}: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
      <Input
        id={inputId}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="h-10 rounded-lg border-0 bg-transparent pl-10 text-xs placeholder:text-stone-400 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-11 sm:text-[15px]"
      />
    </div>
  );
}
