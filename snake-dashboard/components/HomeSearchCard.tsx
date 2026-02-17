"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAllSnakes, isVenomous } from "@/lib/snakeData";
import { searchSnakes, sortSnakes, type SortOption } from "@/lib/searchUtils";
import { SearchBar } from "@/components/SearchBar";
import type { Snake } from "@/lib/types";

function getClassificationTag(venomClassification: Snake["venomClassification"]) {
  switch (venomClassification) {
    case "Highly Venomous":
      return { label: "Highly Venomous", color: "#FF7373" };
    case "Moderately Venomous":
      return { label: "Venomous", color: "#FFAB73" };
    case "Mildly Venomous":
      return { label: "Mildly Venomous", color: "#B9E948" };
    case "Non-venomous":
    default:
      return { label: "Non-venomous", color: "#CCCCCC" };
  }
}

function SnakeListItem({
  snake,
  isActive,
  keyboardPriority,
  onHover,
}: {
  snake: Snake;
  isActive: boolean;
  keyboardPriority: boolean;
  onHover?: () => void;
}) {
  const venomous = isVenomous(snake.venomClassification);
  const classification = getClassificationTag(snake.venomClassification);
  return (
    <div
      onMouseEnter={onHover}
      className={`flex items-center justify-between py-3 px-5 mx-2 rounded-lg transition-colors group ${
        isActive ? "bg-stone-100" : keyboardPriority ? "" : "hover:bg-stone-100"
      }`}
    >
      <Link
        href={`/snakes/${snake.id}`}
        className="flex items-center gap-2 flex-1 min-w-0 no-underline"
      >
        <span
          className={`font-semibold whitespace-nowrap ${
            isActive ? "text-stone-700" : "text-[#2c2c2c] group-hover:text-stone-700"
          }`}
        >
          {snake.commonName}
        </span>
        <span
          className={`text-sm truncate ${
            venomous ? "text-stone-400" : "text-stone-500"
          }`}
        >
          {snake.scientificName}
        </span>
      </Link>

      <div className="flex items-center gap-1 ml-4 shrink-0">
        <Link
          href="/rank"
          className="text-[11px] font-medium px-2 py-0.5 hover:opacity-80 transition-opacity no-underline"
          style={{
            backgroundColor: classification.color,
            color: "#111827",
            borderRadius: 4,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {classification.label}
        </Link>
      </div>
    </div>
  );
}

type HomeSearchCardProps = {
  inputId: string;
  onSelectSnake?: () => void;
  className?: string;
};

function getGroupHeading(snake: Snake, sortBy: SortOption) {
  switch (sortBy) {
    case "venomType":
      return snake.venomTypes?.[0] ?? "No venom type";
    case "region":
      return snake.continent;
    case "family":
      return snake.family;
    case "default":
    default:
      return getClassificationTag(snake.venomClassification).label;
  }
}

export function HomeSearchCard({
  inputId,
  onSelectSnake,
  className = "bg-white rounded-2xl shadow-md overflow-hidden flex-1 min-h-0 flex flex-col",
}: HomeSearchCardProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("alphabetical");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const allSnakes = getAllSnakes();
  const filteredSnakes = useMemo(() => {
    const result = searchQuery ? searchSnakes(allSnakes, searchQuery) : allSnakes;
    return sortSnakes(result, sortBy);
  }, [allSnakes, searchQuery, sortBy]);

  const groupedSnakes = useMemo(() => {
    if (sortBy === "rank" || sortBy === "alphabetical") return null;

    const groups: Array<{ heading: string; items: Array<{ snake: Snake; index: number }> }> = [];
    let currentHeading = "";

    filteredSnakes.forEach((snake, index) => {
      const heading = getGroupHeading(snake, sortBy);
      if (heading !== currentHeading) {
        groups.push({ heading, items: [] });
        currentHeading = heading;
      }
      groups[groups.length - 1].items.push({ snake, index });
    });

    return groups;
  }, [filteredSnakes, sortBy]);

  useEffect(() => {
    setActiveIndex((prev) => {
      if (filteredSnakes.length === 0) return -1;
      if (prev < 0) return -1;
      return Math.min(prev, filteredSnakes.length - 1);
    });
  }, [filteredSnakes.length]);

  useEffect(() => {
    if (!listRef.current || activeIndex < 0) return;
    const activeItem = listRef.current.querySelector<HTMLElement>(
      `[data-snake-index="${activeIndex}"]`
    );
    if (activeItem) {
      // Scroll with offset to account for the tooltip bar at bottom
      const container = listRef.current;
      const itemRect = activeItem.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const tooltipHeight = 70; // Approximate height of tooltip bar
      
      // Check if item is hidden behind tooltip at bottom
      if (itemRect.bottom > containerRect.bottom - tooltipHeight) {
        // Scroll up to keep item visible above tooltip
        activeItem.scrollIntoView({ block: "center", behavior: "smooth" });
      } else if (itemRect.top < containerRect.top) {
        // Item is above viewport, scroll it into view
        activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [activeIndex]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchQuery, sortBy]);

  useEffect(() => {
    function resetKeyboardNavigation() {
      setIsKeyboardNavigating(false);
    }

    window.addEventListener("mousemove", resetKeyboardNavigation);
    window.addEventListener("mousedown", resetKeyboardNavigation);

    return () => {
      window.removeEventListener("mousemove", resetKeyboardNavigation);
      window.removeEventListener("mousedown", resetKeyboardNavigation);
    };
  }, []);

  const navigateToActiveSnake = () => {
    if (activeIndex < 0) return;
    onSelectSnake?.();
    router.push(`/snakes/${filteredSnakes[activeIndex].id}`);
  };

  useEffect(() => {
    function handleGlobalNavigation(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filteredSnakes.length === 0) return;
        setIsKeyboardNavigating(true);
        setActiveIndex((prev) => prev < 0 ? 0 : Math.min(prev + 1, filteredSnakes.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filteredSnakes.length === 0) return;
        setIsKeyboardNavigating(true);
        setActiveIndex((prev) => prev < 0 ? 0 : Math.max(prev - 1, 0));
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        navigateToActiveSnake();
      }
    }

    window.addEventListener("keydown", handleGlobalNavigation);
    return () => window.removeEventListener("keydown", handleGlobalNavigation);
  }, [activeIndex, filteredSnakes]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredSnakes.length === 0) return;
      setIsKeyboardNavigating(true);
      setActiveIndex((prev) => prev < 0 ? 0 : Math.min(prev + 1, filteredSnakes.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredSnakes.length === 0) return;
      setIsKeyboardNavigating(true);
      setActiveIndex((prev) => prev < 0 ? 0 : Math.max(prev - 1, 0));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      navigateToActiveSnake();
    }
  };

  return (
    <div className={`${className} relative`}>
      <div className="pt-2 pb-2 px-6 shrink-0">
        <div className="relative flex items-center gap-2">
          <div className="flex-1">
            <SearchBar
              inputId={inputId}
              onSearch={setSearchQuery}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search for snakes..."
            />
          </div>
          <select
            id={`${inputId}-sort`}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="border-0 rounded-full px-4 h-11 bg-stone-100 text-stone-700 text-xs focus:outline-none focus:ring-0 cursor-pointer appearance-none pr-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.75rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.25em 1.25em',
            }}
          >
            <option value="alphabetical">Default (A-Z)</option>
            <option value="rank">Danger level</option>
            <option value="venomType">Venom type</option>
            <option value="region">Region</option>
            <option value="family">Family</option>
          </select>
        </div>
        <div className="border-b border-stone-200 -mx-6 mt-2" />
      </div>

      <div
        ref={listRef}
        className="px-1.5 pt-2 pb-24 space-y-0 flex-1 min-h-0 overflow-y-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {filteredSnakes.length === 0 ? (
          <div className="py-12 px-6 text-center text-stone-500">
            No snakes found matching your search.
          </div>
        ) : sortBy === "rank" || sortBy === "alphabetical" || !groupedSnakes ? (
          filteredSnakes.map((snake, index) => (
            <div key={snake.id} data-snake-index={index}>
              <SnakeListItem
                snake={snake}
                isActive={index === activeIndex}
                keyboardPriority={isKeyboardNavigating}
                onHover={() => {
                  if (isKeyboardNavigating) return;
                  setActiveIndex(index);
                }}
              />
            </div>
          ))
        ) : (
          groupedSnakes.map((group) => (
            <div key={`${sortBy}-${group.heading}`}>
              <div className="mx-1 my-1 px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-white rounded-sm" style={{ backgroundColor: '#3D3D3D' }}>
                {group.heading}
              </div>
              {group.items.map(({ snake, index }) => (
                <div key={snake.id} data-snake-index={index}>
                  <SnakeListItem
                    snake={snake}
                    isActive={index === activeIndex}
                    keyboardPriority={isKeyboardNavigating}
                    onHover={() => {
                      if (isKeyboardNavigating) return;
                      setActiveIndex(index);
                    }}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Glassy tooltip bar at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 px-6 py-3 border-t border-stone-200/30"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <p className="text-xs text-stone-500 flex items-center justify-center gap-2 flex-wrap relative">
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 rounded bg-stone-200 font-mono text-[11px]">Space</kbd>
          <span>to search,</span>
          <kbd className="px-1.5 py-0.5 rounded bg-stone-200 font-mono text-[11px]">↑</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-stone-200 font-mono text-[11px]">↓</kbd>
          <span>to navigate,</span>
          <kbd className="px-1.5 py-0.5 rounded bg-stone-200 font-mono text-[11px]">Enter</kbd>
          <span>to open</span>
        </p>
      </div>
    </div>
  );
}
