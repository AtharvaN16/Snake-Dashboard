"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Plus, Search, Loader2 } from "lucide-react";

interface SearchNewSnakeProps {
  onAdded: () => void;
}

export function SearchNewSnake({ onAdded }: SearchNewSnakeProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!query) return;
    setLoading(true);
    try {
      // 1. Fetch basic info from Wikipedia to bootstrap
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/ /g, "_"))}`;
      const wikiRes = await fetch(wikiUrl);
      const wikiData = await wikiRes.json();
      
      const commonName = wikiData.title || query;
      const scientificName = query;
      const description = wikiData.extract || "";
      const id = query.toLowerCase().replace(/ /g, "-");

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
        continents: ["Asia"] // Default
      };

      // 3. Save to manualEdits
      const res = await fetch("/api/edit-mode", {
        method: "POST",
        body: JSON.stringify({ action: "add", data: newSnake }),
      });

      if (res.ok) {
        alert(`Added ${commonName} to manualEdits. Run "bun run data:build" to see it in the rankings.`);
        setQuery("");
        onAdded();
      }
    } catch (e) {
      console.error("Failed to add snake:", e);
      alert("Failed to bootstrap snake data. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 max-w-xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Enter scientific name (e.g. 'Bothrops jararacussu')..."
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
  );
}
