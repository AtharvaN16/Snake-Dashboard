"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function ImageRefreshButton({ snakeId }: { snakeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (process.env.NODE_ENV === "production") return null;

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/snakes/${snakeId}/refresh-image`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to refresh image");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors disabled:opacity-50"
        title="Re-source image from Wikimedia/iNaturalist/GBIF"
      >
        <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Sourcing..." : "Refresh image"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
