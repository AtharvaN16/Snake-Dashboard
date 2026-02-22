"use client";

import { useState, useCallback } from "react";
import { RefreshCw, Star, ExternalLink, X, Check, Edit2, Trash2 } from "lucide-react";

interface CandidateEntry {
  index: number;
  src: string;
  source: string;
  score: number;
  attribution: {
    photographer?: string;
    source: string;
    sourceUrl: string;
    license: string;
    licenseUrl: string;
  };
}

interface SnakeImages {
  primary: string;
  thumbnail: string;
  gallery?: string[];
  attribution: { photographer?: string; source: string };
}

type Role = "primary" | "gallery";

const SOURCE_COLORS: Record<string, string> = {
  "Wikimedia Commons": "bg-blue-100 text-blue-700",
  "iNaturalist": "bg-green-100 text-green-700",
  "GBIF": "bg-amber-100 text-amber-700",
};

function useRefreshAction(snakeId: string) {
  return async (action: string, extra?: Record<string, unknown>) => {
    const res = await fetch(`/api/snakes/${snakeId}/refresh-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const raw = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      throw new Error(
        `Server returned non-JSON response (${res.status}). Check server logs and retry.`
      );
    }
    const errorMessage = typeof data.error === "string" ? data.error : `${action} failed`;
    if (!res.ok) throw new Error(errorMessage);
    return data;
  };
}

export function ImageCandidatePicker({ snakeId }: { snakeId: string }) {
  const [candidates, setCandidates] = useState<CandidateEntry[]>([]);
  const [currentImages, setCurrentImages] = useState<SnakeImages | null>(null);
  const [selections, setSelections] = useState<Map<number, Role>>(new Map());
  const [searching, setSearching] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  const callAction = useRefreshAction(snakeId);

  const handleSearch = async () => {
    setOpen(true);
    setEditOpen(false);
    setSearching(true);
    setError(null);
    setSelections(new Map());

    try {
      const data = await callAction("search") as { candidates: CandidateEntry[] };
      setCandidates(data.candidates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSearching(false);
    }
  };

  const handleEditOpen = async () => {
    setEditOpen(true);
    setOpen(false);
    setError(null);
    
    try {
      const res = await fetch(`/api/snakes/${snakeId}/refresh-image`);
      const raw = await res.text();
      let data: { images?: SnakeImages | null } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          `Server returned non-JSON response (${res.status}). Check server logs and retry.`
        );
      }
      setCurrentImages(data.images ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load current images");
    }
  };

  const handleDeleteGallery = async (imagePath: string) => {
    if (!confirm("Are you sure you want to delete this gallery image?")) return;
    setDeleting(imagePath);
    try {
      await callAction("delete-gallery", { imagePath });
      setCurrentImages(prev => {
        if (!prev || !prev.gallery) return prev;
        return {
          ...prev,
          gallery: prev.gallery.filter(p => p !== imagePath)
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const handlePromoteToPrimary = async (imagePath: string) => {
    if (!confirm("Set this image as the main primary image?")) return;
    setPromoting(imagePath);
    try {
      await callAction("promote-to-primary", { imagePath });
      // Reload to reflect new primary image throughout page
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Promotion failed");
      setPromoting(null);
    }
  };

  const toggleGallery = useCallback((index: number) => {
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.get(index) === "gallery") {
        next.delete(index);
      } else {
        next.set(index, "gallery");
      }
      return next;
    });
  }, []);

  const togglePrimary = useCallback((index: number) => {
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.get(index) === "primary") {
        // Deselect primary
        next.delete(index);
      } else {
        // Remove any existing primary first
        for (const [k, v] of next) {
          if (v === "primary") next.delete(k);
        }
        next.set(index, "primary");
      }
      return next;
    });
  }, []);

  const handleCommit = async () => {
    if (selections.size === 0) return;
    setCommitting(true);
    setError(null);

    const selArray = Array.from(selections.entries()).map(
      ([candidateIndex, role]) => ({ candidateIndex, role })
    );

    try {
      await callAction("commit", { selections: selArray });
      setTimeout(() => window.location.reload(), 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setCommitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditOpen(false);
    setCandidates([]);
    setSelections(new Map());
    setError(null);
  };

  // Selection summary
  const primaryCount = Array.from(selections.values()).filter(
    (r) => r === "primary"
  ).length;
  const galleryCount = Array.from(selections.values()).filter(
    (r) => r === "gallery"
  ).length;

  // Collapsed state — just show the search button
  if (!open && !editOpen) {
    return (
      <div className="relative z-20 max-w-[760px] mb-4 flex gap-2">
        <button
          onClick={handleSearch}
          disabled={searching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors disabled:opacity-50"
          title="Search Wikimedia, iNaturalist, and GBIF for images"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${searching ? "animate-spin" : ""}`} />
          {searching ? "Searching sources..." : "Search for images"}
        </button>
        <button
          onClick={handleEditOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors"
          title="Manage existing images"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit gallery
        </button>
      </div>
    );
  }

  // Expanded state — Gallery Editor
  if (editOpen) {
    return (
      <div className="relative z-20 max-w-[760px] mb-6">
        <div className="rounded-xl bg-white p-4 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-stone-700">Manage existing gallery</h3>
            <button
              onClick={handleClose}
              className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          
          {currentImages?.gallery && currentImages.gallery.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {currentImages.gallery.map((path, idx) => (
                <div key={path} className="group relative aspect-[4/3] rounded-lg border border-stone-200 bg-stone-50 overflow-hidden">
                  <img
                    src={`${path}?t=${Date.now()}`}
                    alt={`Gallery ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  
                  <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handlePromoteToPrimary(path)}
                      disabled={promoting === path || deleting === path}
                      className="p-1.5 rounded-md bg-white/90 text-amber-500 shadow-sm hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50"
                      title="Set as primary"
                    >
                      <Star className={`w-3.5 h-3.5 ${promoting === path ? "animate-spin" : ""}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteGallery(path)}
                      disabled={deleting === path || promoting === path}
                      className="p-1.5 rounded-md bg-white/90 text-red-500 shadow-sm hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                      title="Delete image"
                    >
                      <Trash2 className={`w-3.5 h-3.5 ${deleting === path ? "animate-pulse" : ""}`} />
                    </button>
                  </div>

                  <div className="absolute bottom-1 left-1.5 text-[9px] text-white font-medium drop-shadow-sm">
                    {path.split('/').pop()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400 py-6 text-center italic">
              No gallery images found for this snake.
            </p>
          )}

          <div className="mt-4 pt-3 border-t border-stone-100 flex justify-end gap-2">
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-medium text-stone-500 hover:text-stone-700 underline"
            >
              Finish & Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Expanded state — batch picker
  return (
    <div className="relative z-20 max-w-[760px] mb-6">
      <div className="rounded-xl bg-white p-4 border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-stone-700">
              Image candidates{candidates.length > 0 && ` (${candidates.length})`}
            </h3>
            {selections.size > 0 && (
              <span className="text-xs text-stone-500">
                {primaryCount > 0 && `1 primary`}
                {primaryCount > 0 && galleryCount > 0 && ", "}
                {galleryCount > 0 && `${galleryCount} gallery`}
                {" selected"}
              </span>
            )}
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCommit}
              disabled={selections.size === 0 || committing}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-3 h-3" />
              {committing ? "Processing..." : "Done"}
            </button>
            <button
              onClick={handleSearch}
              disabled={searching || committing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${searching ? "animate-spin" : ""}`} />
              {searching ? "Searching..." : "Re-search"}
            </button>
            <button
              onClick={handleClose}
              disabled={committing}
              className="inline-flex items-center justify-center p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded transition-colors"
              title="Close picker"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Candidate grid */}
        {candidates.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {candidates.map((c) => {
              const role = selections.get(c.index);
              const isPrimary = role === "primary";
              const isGallery = role === "gallery";
              const isSelected = isPrimary || isGallery;

              return (
                <div
                  key={c.index}
                  className={`group relative rounded-lg border-2 transition-all cursor-pointer ${
                    isPrimary
                      ? "border-amber-400 ring-2 ring-amber-200 bg-amber-50"
                      : isGallery
                      ? "border-blue-400 ring-2 ring-blue-200 bg-blue-50"
                      : "border-stone-200 bg-stone-50 hover:border-stone-300"
                  }`}
                  onClick={() => toggleGallery(c.index)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-[4/3] relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${c.src}?t=${Date.now()}`}
                      alt={`Candidate ${c.index + 1}`}
                      className="w-full h-full object-cover rounded-t-[6px]"
                    />

                    {/* Gallery checkbox overlay */}
                    {isGallery && (
                      <div className="absolute bottom-2 left-2 w-5 h-5 rounded bg-blue-500 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}

                    {/* Primary star overlay */}
                    {isPrimary && (
                      <div className="absolute bottom-2 left-2 w-5 h-5 rounded bg-amber-500 flex items-center justify-center">
                        <Star className="w-3.5 h-3.5 text-white fill-white" />
                      </div>
                    )}

                    {/* Source + score badge */}
                    <div className="absolute top-1.5 left-1.5 flex gap-1">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          SOURCE_COLORS[c.source] || "bg-stone-200 text-stone-600"
                        }`}
                      >
                        {c.source.replace("Wikimedia Commons", "Wikimedia")}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/50 text-white">
                        {c.score}pts
                      </span>
                    </div>

                    {/* Star button (top-right) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePrimary(c.index);
                      }}
                      className={`absolute top-1.5 right-8 p-1 rounded transition-colors ${
                        isPrimary
                          ? "bg-amber-500 text-white"
                          : "bg-black/40 text-white hover:bg-amber-500"
                      }`}
                      title={isPrimary ? "Remove as primary" : "Set as primary"}
                    >
                      <Star className={`w-3 h-3 ${isPrimary ? "fill-white" : ""}`} />
                    </button>

                    {/* Source link */}
                    <a
                      href={c.attribution.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-1.5 right-1.5 p-1 rounded bg-black/40 text-white hover:bg-black/60 transition-colors"
                      title="View source"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    {/* Selection dimming overlay for unselected when others are selected */}
                    {selections.size > 0 && !isSelected && (
                      <div className="absolute inset-0 bg-white/40 rounded-t-[6px]" />
                    )}
                  </div>

                  {/* Attribution info */}
                  <div className="p-2">
                    <p className="text-[10px] text-stone-500 truncate">
                      {c.attribution.photographer || "Unknown"} · {c.attribution.license}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-4 text-center">
            {searching
              ? "Searching Wikimedia, iNaturalist, and GBIF..."
              : "Click Re-search to find image candidates."}
          </p>
        )}
      </div>
    </div>
  );
}
