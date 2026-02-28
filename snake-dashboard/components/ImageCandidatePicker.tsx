"use client";

import { useState, useCallback, useEffect } from "react";
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

export function ImageCandidatePicker({ 
  snakeId, 
  embedded = false, 
  onClose 
}: { 
  snakeId: string; 
  embedded?: boolean;
  onClose?: () => void;
}) {
  const [candidates, setCandidates] = useState<CandidateEntry[]>([]);
  const [currentImages, setCurrentImages] = useState<SnakeImages | null>(null);
  const [selections, setSelections] = useState<Map<number, Role>>(new Map());
  const [searching, setSearching] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(embedded);
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
      const data = await callAction("search") as { candidates: CandidateEntry[], usedFallback?: boolean };
      setCandidates(data.candidates);
      if (data.candidates.length === 0) {
        setError("No images found for scientific or common name.");
      }
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
      if (onClose) onClose();
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
      if (onClose) onClose();
      else window.location.reload();
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
        next.delete(index);
      } else {
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
      if (onClose) {
        setTimeout(() => {
          setCommitting(false);
          setSelections(new Map());
          onClose();
        }, 500);
      } else {
        setTimeout(() => window.location.reload(), 300);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setCommitting(false);
    }
  };

  const handleCloseInternal = () => {
    if (onClose && !embedded) onClose();
    setOpen(embedded);
    setEditOpen(false);
    setCandidates([]);
    setSelections(new Map());
    setError(null);
  };

  const primaryCount = Array.from(selections.values()).filter((r) => r === "primary").length;
  const galleryCount = Array.from(selections.values()).filter((r) => r === "gallery").length;

  // Collapsed state
  if (!open && !editOpen && !embedded) {
    return (
      <div className="relative z-20 max-w-[760px] mb-4 flex gap-2">
        <button
          onClick={handleSearch}
          disabled={searching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${searching ? "animate-spin" : ""}`} />
          {searching ? "Searching sources..." : "Search for images"}
        </button>
        <button
          onClick={handleEditOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors"
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
      <div className={`${embedded ? "" : "relative z-20 max-w-[760px] mb-6"}`}>
        <div className={`rounded-xl bg-white p-4 ${embedded ? "" : "border border-stone-200 shadow-sm"}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-stone-700">Manage existing gallery</h3>
            <div className="flex items-center gap-2">
               <button onClick={() => setEditOpen(false)} className="text-[10px] font-bold text-stone-400 uppercase hover:text-stone-600 mr-2">Back to Search</button>
               <button onClick={handleCloseInternal} className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded transition-colors">
                 <X className="w-4 h-4" />
               </button>
            </div>
          </div>
          
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          
          {currentImages?.gallery && currentImages.gallery.length > 0 ? (
            <div className={`grid gap-3 ${embedded ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
              {currentImages.gallery.map((path, idx) => (
                <div key={path} className="group relative aspect-[4/3] rounded-lg border border-stone-200 bg-stone-50 overflow-hidden">
                  <img src={`${path}?t=${Date.now()}`} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handlePromoteToPrimary(path)} disabled={promoting === path} className="p-1.5 rounded-md bg-white/90 text-amber-500 shadow-sm hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50">
                      <Star className={`w-3.5 h-3.5 ${promoting === path ? "animate-spin" : ""}`} />
                    </button>
                    <button onClick={() => handleDeleteGallery(path)} disabled={deleting === path} className="p-1.5 rounded-md bg-white/90 text-red-500 shadow-sm hover:bg-red-500 hover:text-white transition-all disabled:opacity-50">
                      <Trash2 className={`w-3.5 h-3.5 ${deleting === path ? "animate-pulse" : ""}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400 py-6 text-center italic">No gallery images found.</p>
          )}
        </div>
      </div>
    );
  }

  // Expanded state — batch picker
  return (
    <div className={`${embedded ? "" : "relative z-20 max-w-[760px] mb-6"}`}>
      <div className={`rounded-xl bg-white p-4 ${embedded ? "" : "border border-stone-200"}`}>
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-700">
              {searching ? "Searching..." : `Found ${candidates.length} candidates`}
            </h3>
            <div className="flex items-center gap-2">
              {!embedded && (
                <button onClick={handleCloseInternal} disabled={committing} className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCommit} disabled={selections.size === 0 || committing} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-40">
              <Check className="w-3.5 h-3.5" />
              {committing ? "Saving..." : selections.size > 0 ? `Apply ${selections.size} selections` : "Select images"}
            </button>
            <button onClick={handleSearch} disabled={searching || committing} className="p-2 text-stone-500 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
              <RefreshCw className={`w-4 h-4 ${searching ? "animate-spin" : ""}`} />
            </button>
            <button onClick={handleEditOpen} disabled={committing} className="p-2 text-stone-500 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors" title="Edit existing gallery">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
          {error && <span className="text-[10px] text-red-500 font-medium">{error}</span>}
        </div>

        {candidates.length > 0 ? (
          <div className={`grid gap-2 ${embedded ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}`}>
            {candidates.map((c) => {
              const role = selections.get(c.index);
              const isPrimary = role === "primary";
              const isGallery = role === "gallery";
              const isSelected = isPrimary || isGallery;

              return (
                <div key={c.index} className={`group relative rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${isPrimary ? "border-amber-400 ring-2 ring-amber-200" : isGallery ? "border-blue-400 ring-2 ring-blue-200" : "border-stone-100 bg-stone-50 hover:border-stone-200"}`} onClick={() => toggleGallery(c.index)}>
                  <div className="aspect-square relative">
                    <img src={`${c.src}?t=${Date.now()}`} alt="" className="w-full h-full object-cover" />
                    {isGallery && <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center"><Check className="w-8 h-8 text-white drop-shadow-md" /></div>}
                    {isPrimary && <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center"><Star className="w-8 h-8 text-white fill-white drop-shadow-md" /></div>}
                    <div className="absolute top-1 left-1 flex gap-1">
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded shadow-sm ${SOURCE_COLORS[c.source] || "bg-stone-200 text-stone-600"}`}>
                        {c.source === "Wikimedia Commons" ? "Wiki" : c.source}
                      </span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); togglePrimary(c.index); }} className={`absolute bottom-1 right-1 p-1.5 rounded-md transition-colors ${isPrimary ? "bg-amber-500 text-white shadow-md" : "bg-black/40 text-white hover:bg-amber-500"}`}>
                      <Star className={`w-3.5 h-3.5 ${isPrimary ? "fill-white" : ""}`} />
                    </button>
                    <a href={c.attribution.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="absolute top-1 right-1 p-1 rounded bg-black/20 text-white/80 hover:bg-black/40 transition-colors">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !searching && (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-stone-100 rounded-xl bg-stone-50/30">
              <ImageIcon className="w-8 h-8 text-stone-200 mb-3" />
              <p className="text-[11px] text-stone-400 mb-4 italic">No image candidates found.</p>
              <button 
                onClick={handleSearch}
                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-stone-800 transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Start Search
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
