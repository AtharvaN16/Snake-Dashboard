"use client";

import { useState } from "react";
import { RefreshCw, Star, Trash2, ExternalLink, X, ImagePlus } from "lucide-react";

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

const SOURCE_COLORS: Record<string, string> = {
  "Wikimedia Commons": "bg-blue-100 text-blue-700",
  "iNaturalist": "bg-green-100 text-green-700",
  "GBIF": "bg-amber-100 text-amber-700",
};

function useRefreshAction(snakeId: string) {
  return async (action: string, candidateIndex?: number) => {
    const res = await fetch(`/api/snakes/${snakeId}/refresh-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, candidateIndex }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `${action} failed`);
    return data;
  };
}

export function ImageCandidatePicker({ snakeId }: { snakeId: string }) {
  const [candidates, setCandidates] = useState<CandidateEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState<number | null>(null);
  const [addingToGallery, setAddingToGallery] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  const callAction = useRefreshAction(snakeId);

  const handleSearch = async () => {
    setOpen(true);
    setSearching(true);
    setError(null);
    setMessage(null);

    try {
      const data = await callAction("search");
      setCandidates(data.candidates);
      setMessage(`Found ${data.candidates.length} candidates`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSearching(false);
    }
  };

  const handleSetPrimary = async (candidateIndex: number) => {
    setSettingPrimary(candidateIndex);
    setError(null);
    setMessage(null);

    try {
      await callAction("set-primary", candidateIndex);
      setMessage("Primary image updated! Reloading...");
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSettingPrimary(null);
    }
  };

  const handleAddToGallery = async (candidateIndex: number) => {
    setAddingToGallery(candidateIndex);
    setError(null);
    setMessage(null);

    try {
      const data = await callAction("add-to-gallery", candidateIndex);
      setMessage(`Added to gallery as image #${data.galleryIndex}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setAddingToGallery(null);
    }
  };

  const handleDelete = async (candidateIndex: number) => {
    setDeleting(candidateIndex);
    setError(null);

    try {
      const data = await callAction("delete", candidateIndex);
      setCandidates(data.candidates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setDeleting(null);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCandidates([]);
    setError(null);
    setMessage(null);
  };

  // Collapsed state — just show the search button
  if (!open) {
    return (
      <div className="relative z-20 max-w-[760px] mb-4">
        <button
          onClick={handleSearch}
          disabled={searching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors disabled:opacity-50"
          title="Search Wikimedia, iNaturalist, and GBIF for images"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${searching ? "animate-spin" : ""}`} />
          {searching ? "Searching sources..." : "Search for images"}
        </button>
      </div>
    );
  }

  // Expanded state — full picker
  return (
    <div className="relative z-20 max-w-[760px] mb-6">
      <div className="rounded-xl bg-white p-4 border border-stone-200">
        {/* Header with title, search, and close */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-stone-700">
              Image candidates{candidates.length > 0 && ` (${candidates.length})`}
            </h3>
            {error && <span className="text-xs text-red-500">{error}</span>}
            {message && <span className="text-xs text-green-600">{message}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSearch}
              disabled={searching}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${searching ? "animate-spin" : ""}`} />
              {searching ? "Searching..." : "Re-search"}
            </button>
            <button
              onClick={handleClose}
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
            {candidates.map((c) => (
              <div
                key={c.index}
                className="group relative rounded-lg border border-stone-200 bg-stone-50"
              >
                {/* Thumbnail */}
                <div className="aspect-[4/3] relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${c.src}?t=${Date.now()}`}
                    alt={`Candidate ${c.index + 1}`}
                    className="w-full h-full object-cover rounded-t-lg"
                  />

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

                  {/* Source link */}
                  <a
                    href={c.attribution.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-1.5 right-1.5 p-1 rounded bg-black/40 text-white hover:bg-black/60 transition-colors"
                    title="View source"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Info + actions */}
                <div className="p-2">
                  <p className="text-[10px] text-stone-500 truncate mb-2">
                    {c.attribution.photographer || "Unknown"} · {c.attribution.license}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleSetPrimary(c.index)}
                      disabled={settingPrimary !== null || addingToGallery !== null}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium bg-stone-800 text-white rounded hover:bg-stone-700 transition-colors disabled:opacity-50"
                      title="Set as main image"
                    >
                      <Star className="w-3 h-3" />
                      {settingPrimary === c.index ? "Setting..." : "Primary"}
                    </button>
                    <button
                      onClick={() => handleAddToGallery(c.index)}
                      disabled={settingPrimary !== null || addingToGallery !== null}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium bg-stone-100 text-stone-700 rounded hover:bg-stone-200 transition-colors disabled:opacity-50"
                      title="Add to additional images"
                    >
                      <ImagePlus className="w-3 h-3" />
                      {addingToGallery === c.index ? "Adding..." : "Gallery"}
                    </button>
                    <button
                      onClick={() => handleDelete(c.index)}
                      disabled={deleting !== null}
                      className="inline-flex items-center justify-center p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Remove candidate"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-4 text-center">
            {searching ? "Searching Wikimedia, iNaturalist, and GBIF..." : "Click Re-search to find image candidates."}
          </p>
        )}
      </div>
    </div>
  );
}
