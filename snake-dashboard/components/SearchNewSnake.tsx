"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Plus, Search, Loader2 } from "lucide-react";

interface SearchNewSnakeProps {
  onAdded: () => void;
  onDraftCreated: (snake: any) => void;
}

export function SearchNewSnake({ onAdded, onDraftCreated }: SearchNewSnakeProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!query) return;
    console.log("[SearchNewSnake] Starting add for:", query);
    setLoading(true);
    setStatus("Bootstrapping snake data...");
    try {
      const cleanQuery = query.trim();
      // Ensure first letter capitalized for Wikipedia
      const searchTitle = cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1);

      console.log("[SearchNewSnake] Fetching Wikipedia summary for:", searchTitle);
      // 1. Fetch basic info from Wikipedia to bootstrap
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTitle.replace(/ /g, "_"))}`;
      const wikiRes = await fetch(wikiUrl);
      
      console.log("[SearchNewSnake] Wikipedia response status:", wikiRes.status);
      if (!wikiRes.ok) {
        if (wikiRes.status === 404) {
          throw new Error(`Species "${cleanQuery}" not found on Wikipedia. Use precise scientific name.`);
        }
        throw new Error(`Wikipedia error: ${wikiRes.statusText}`);
      }
      
      const wikiData = await wikiRes.json();
      console.log("[SearchNewSnake] Wikipedia data received:", wikiData.title);
      
      // If the user typed a common name, Wikipedia usually has the scientific name in its metadata
      // or we use the 'title' which is often the preferred common name.
      const commonName = wikiData.title || cleanQuery;
      
      // Try to extract scientific name from the description or title if cleanQuery was common
      let scientificName = searchTitle;
      
      // Detect if cleanQuery was likely a common name (no two-word Latin structure)
      const isLikelyCommon = !cleanQuery.includes(" ") || cleanQuery.split(" ").some(w => w.length > 1 && !/^[A-Z]/.test(w[0]));
      
      // Wikipedia API provides 'displaytitle' which often contains italics for scientific names
      if (wikiData.displaytitle && wikiData.displaytitle.includes("<i>")) {
        const match = wikiData.displaytitle.match(/<i>(.*?)<\/i>/);
        if (match) {
          scientificName = match[1];
          console.log("[SearchNewSnake] Extracted scientific name from displaytitle:", scientificName);
        }
      }

      const description = wikiData.extract || "";
      const id = scientificName.toLowerCase().replace(/ /g, "-").replace(/[^a-z-]/g, "");

      setStatus(`Found ${commonName}. Saving draft...`);

      // 2. Create a skeleton snake entry
      const newSnake = {
        id,
        commonName,
        scientificName,
        family: "TBD",
        genus: scientificName.split(" ")[0],
        dangerScore: 0,
        venomClassification: "Venomous",
        humanEncounterChance: "Low",
        description,
        distribution: {
          regions: ["TBD"],
          habitat: "TBD"
        },
        continents: ["Asia"], // Default
        isDraft: true // Visual flag for the sidebar
      };

      console.log("[SearchNewSnake] Posting to manualEdits API...");
      // 3. Save to manualEdits
      const res = await fetch("/api/edit-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", data: newSnake }),
      });

      console.log("[SearchNewSnake] API response status:", res.status);
      if (!res.ok) {
        throw new Error(`Failed to save draft: ${res.statusText}`);
      }

      const resData = await res.json();
      console.log("[SearchNewSnake] API response data:", resData);

      setStatus(`Successfully added ${commonName}! Opening sidebar...`);
      setQuery("");
      onAdded();
      onDraftCreated(newSnake);
      setTimeout(() => setStatus(null), 5000);
    } catch (e) {
      console.error("[SearchNewSnake] ERROR:", e);
      setStatus(`Error: ${e instanceof Error ? e.message : "Failed to add snake"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Enter scientific name (e.g. 'Naja atra')..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400/20"
          />
        </div>
        <Button 
          variant="default" 
          size="sm" 
          className="h-9 gap-2" 
          onClick={handleAdd}
          disabled={loading || !query}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Snake
        </Button>
      </div>
      {status && (
        <p className={`text-[10px] font-bold uppercase tracking-wider ${status.includes('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
          {status}
        </p>
      )}
    </div>
  );
}
