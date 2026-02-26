"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAllSnakes, isVenomous } from "@/lib/snakeData";
import { searchSnakes, sortSnakes, type SortOption } from "@/lib/searchUtils";
import { SearchBar } from "@/components/SearchBar";
import { Kbd } from "@/components/ui/kbd";
import type { Snake } from "@/lib/types";

/** Light background + dark text for small tags (search & rankings only) */
function getClassificationTag(venomClassification: Snake["venomClassification"]) {
  switch (venomClassification) {
    case "Highly Venomous":
      return { label: "Highly Venomous", bg: "#FFDADA", text: "#B22222" };
    case "Venomous":
      return { label: "Venomous", bg: "#FFE4CC", text: "#C2410C" };
    case "Moderately Venomous":
      return { label: "Moderately Venomous", bg: "#FEF08A", text: "#854D0E" };
    case "Mildly Venomous":
      return { label: "Mildly Venomous", bg: "#DCFCE7", text: "#166534" };
    case "Non-venomous":
    default:
      return { label: "Non-venomous", bg: "#F3F4F6", text: "#4B5563" };
  }
}

function SnakeListItem({
  snake,
  isActive,
  keyboardPriority,
  onHover,
  onSelectSnake,
  getSnakeHref,
}: {
  snake: Snake;
  isActive: boolean;
  keyboardPriority: boolean;
  onHover?: () => void;
  onSelectSnake?: () => void;
  getSnakeHref?: (snake: Snake) => string;
}) {
  const venomous = isVenomous(snake.venomClassification);
  const classification = getClassificationTag(snake.venomClassification);
  const href = getSnakeHref ? getSnakeHref(snake) : `/snakes/${snake.id}`;
  return (
    <div
      onMouseEnter={onHover}
      className="mx-1.5 sm:mx-2"
    >
      <Link
        href={href}
        className={`group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors sm:px-5 sm:py-3 ${
          isActive ? "bg-stone-100" : keyboardPriority ? "" : "hover:bg-stone-100"
        } flex-1 min-w-0 no-underline`}
        onClick={() => onSelectSnake?.()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`min-w-0 truncate text-sm font-semibold sm:text-base ${
              isActive ? "text-stone-700" : "text-[#2c2c2c] group-hover:text-stone-700"
            }`}
          >
            {snake.commonName}
          </span>
          <span
            className={`hidden truncate text-xs sm:inline sm:text-sm ${
              venomous ? "text-stone-400" : "text-stone-500"
            }`}
          >
            {snake.scientificName}
          </span>
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-1 sm:ml-4">
          <span
            className="max-w-[110px] truncate rounded px-2 py-0.5 text-[9px] font-medium sm:max-w-none sm:text-[11px]"
            style={{
              backgroundColor: classification.bg,
              color: classification.text,
            }}
          >
            {classification.label}
          </span>
        </div>
      </Link>
    </div>
  );
}

type HomeSearchCardProps = {
  inputId: string;
  onSelectSnake?: () => void;
  /** When set (e.g. on phylogeny page), used for Link href and keyboard nav instead of /snakes/:id */
  getSnakeHref?: (snake: Snake) => string;
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
  getSnakeHref,
  className = "bg-white rounded-2xl shadow-md overflow-hidden flex flex-col w-full",
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
  const effectiveActiveIndex =
    filteredSnakes.length === 0 || activeIndex < 0
      ? -1
      : Math.min(activeIndex, filteredSnakes.length - 1);

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

  // Auto-scroll only for keyboard navigation; do not scroll when hovering with cursor
  useEffect(() => {
    if (!isKeyboardNavigating || !listRef.current || effectiveActiveIndex < 0) return;
    const activeItem = listRef.current.querySelector<HTMLElement>(
      `[data-snake-index="${effectiveActiveIndex}"]`
    );
    if (activeItem) {
      const container = listRef.current;
      const itemRect = activeItem.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const tooltipHeight = 70;

      if (itemRect.bottom > containerRect.bottom - tooltipHeight) {
        activeItem.scrollIntoView({ block: "center", behavior: "smooth" });
      } else if (itemRect.top < containerRect.top) {
        activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [effectiveActiveIndex, isKeyboardNavigating]);

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

  const navigateToActiveSnake = useCallback(() => {
    if (effectiveActiveIndex < 0) return;
    const snake = filteredSnakes[effectiveActiveIndex];
    onSelectSnake?.();
    router.push(getSnakeHref ? getSnakeHref(snake) : `/snakes/${snake.id}`);
  }, [effectiveActiveIndex, filteredSnakes, getSnakeHref, onSelectSnake, router]);

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
  }, [filteredSnakes, navigateToActiveSnake]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setActiveIndex(-1);
  };

  const handleSortChange = (nextSort: SortOption) => {
    setSortBy(nextSort);
    setActiveIndex(-1);
  };

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
      <div className="shrink-0 px-3 pb-2 pt-2 sm:px-6">
        <div className="relative flex flex-wrap items-center gap-2">
          <div className="flex-1">
            <SearchBar
              inputId={inputId}
              onSearch={handleSearch}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search for snakes..."
            />
          </div>
          <select
            id={`${inputId}-sort`}
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            className="h-10 w-full cursor-pointer appearance-none rounded-full border-0 bg-stone-100 px-4 pr-10 text-[10px] text-stone-700 focus:outline-none focus:ring-0 sm:h-11 sm:w-auto sm:text-xs"
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
        <div className="-mx-3 mt-2 border-b border-stone-200 sm:-mx-6" />
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-0 overflow-y-auto px-1.5 pb-6 pt-2 scrollbar-hide lg:pb-24"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {filteredSnakes.length === 0 ? (
          <div className="px-6 py-10 text-center text-xs text-stone-500 sm:py-12 sm:text-sm">
            No snakes found matching your search.
          </div>
        ) : sortBy === "rank" || sortBy === "alphabetical" || !groupedSnakes ? (
          filteredSnakes.map((snake, index) => (
            <div key={snake.id} data-snake-index={index}>
              <SnakeListItem
                snake={snake}
                isActive={index === effectiveActiveIndex}
                keyboardPriority={isKeyboardNavigating}
                onHover={() => {
                  if (isKeyboardNavigating) return;
                  setActiveIndex(index);
                }}
                onSelectSnake={onSelectSnake}
                getSnakeHref={getSnakeHref}
              />
            </div>
          ))
        ) : (
          groupedSnakes.map((group) => (
            <div key={`${sortBy}-${group.heading}`}>
              <div className="mx-1 my-1 rounded-sm px-4 py-1 text-[9px] font-semibold uppercase tracking-wide text-white sm:text-[11px]" style={{ backgroundColor: '#3D3D3D' }}>
                {group.heading}
              </div>
              {group.items.map(({ snake, index }) => (
                <div key={snake.id} data-snake-index={index}>
                  <SnakeListItem
                    snake={snake}
                    isActive={index === effectiveActiveIndex}
                    keyboardPriority={isKeyboardNavigating}
                    onHover={() => {
                      if (isKeyboardNavigating) return;
                      setActiveIndex(index);
                    }}
                    onSelectSnake={onSelectSnake}
                    getSnakeHref={getSnakeHref}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Glassy tooltip bar at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 hidden border-t border-stone-200/30 px-6 py-3 lg:block"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <p className="text-xs text-stone-500 flex items-center justify-center gap-2 flex-wrap relative">
          <span>Press</span>
          <Kbd triggerKey=" ">Space</Kbd>
          <span>to search,</span>
          <Kbd triggerKey="ArrowUp">↑</Kbd>
          <Kbd triggerKey="ArrowDown">↓</Kbd>
          <span>to navigate,</span>
          <Kbd triggerKey="Enter">Enter</Kbd>
          <span>to open</span>
        </p>
      </div>
    </div>
  );
}
