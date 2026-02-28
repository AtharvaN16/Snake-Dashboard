"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { 
  X, Save, Trash2, Sparkles, PlusCircle, 
  Loader2, RefreshCw, ChevronRight, ChevronLeft,
  Image as ImageIcon, CheckCircle2, AlertTriangle
} from "lucide-react";
import { ImageCandidatePicker } from "./ImageCandidatePicker";
import Image from "next/image";
import type { Snake } from "@/lib/types";

interface RankEditPanelProps {
  snake: Snake;
  onClose: () => void;
  onRefresh: () => void;
}

export function RankEditPanel({ snake, onClose, onRefresh }: RankEditPanelProps) {
  const [description, setDescription] = useState(snake.description || "");
  const [aka, setAka] = useState(snake.otherCommonNames?.join(", ") || "");
  const [risk, setRisk] = useState<"high" | "low">(snake.misidentificationRisk || "low");
  const [lookalikes, setLookalikes] = useState<string[]>(snake.commonlyMisidentifiedAs || []);
  const [newLookalike, setNewLookalike] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"images" | "content" | "range">("images");
  const [rangeStatus, setRangeStatus] = useState<string | null>(null);
  const [descStatus, setDescStatus] = useState<string | null>(null);
  const [akaStatus, setAkaStatus] = useState<string | null>(null);
  const [riskStatus, setRiskStatus] = useState<string | null>(null);

  useEffect(() => {
    setDescription(snake.description || "");
    setAka(snake.otherCommonNames?.join(", ") || "");
    setRisk(snake.misidentificationRisk || "low");
    setLookalikes(snake.commonlyMisidentifiedAs || []);
    setRangeStatus(null);
    setDescStatus(null);
    setAkaStatus(null);
    setRiskStatus(null);
  }, [snake]);

  const handleSaveFields = async () => {
    setLoading(true);
    try {
      await fetch("/api/edit-mode", {
        method: "POST",
        body: JSON.stringify({ 
          action: "updateFields", 
          id: snake.id, 
          data: { 
            description, 
            otherCommonNames: aka.split(",").map(s => s.trim()).filter(Boolean),
            misidentificationRisk: risk,
            commonlyMisidentifiedAs: lookalikes
          } 
        }),
      });
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (field: "description" | "AKA" | "MisidentificationRisk" | "RangeMap") => {
    setLoading(true);
    if (field === "description") setDescStatus("Fetching description...");
    if (field === "AKA") setAkaStatus("Searching names...");
    if (field === "MisidentificationRisk") setRiskStatus("Analyzing lookalikes...");
    if (field === "RangeMap") setRangeStatus("Generating map...");

    try {
      const res = await fetch("/api/edit-mode", {
        method: "POST",
        body: JSON.stringify({ action: `generate${field}`, id: snake.id }),
      });
      const data = await res.json();
      if (data.success) {
        if (field === "description") {
          setDescription(data.description);
          setDescStatus("Fetched from Wikipedia.");
        }
        if (field === "AKA") {
          setAka(data.otherCommonNames.join(", "));
          setAkaStatus("Names updated.");
        }
        if (field === "MisidentificationRisk") {
          setRisk(data.risk);
          setLookalikes(data.lookalikes);
          setRiskStatus("Analysis complete.");
        }
        if (field === "RangeMap") {
          setRangeStatus("Success! Range map generated.");
          onRefresh();
        }
      } else {
        const errMsg = `Error: ${data.error || "Failed"}`;
        if (field === "description") setDescStatus(errMsg);
        if (field === "AKA") setAkaStatus(errMsg);
        if (field === "MisidentificationRisk") setRiskStatus(errMsg);
        if (field === "RangeMap") setRangeStatus(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const addLookalike = () => {
    if (!newLookalike) return;
    const clean = newLookalike.trim().toLowerCase().replace(/ /g, "-");
    if (!lookalikes.includes(clean)) {
      setLookalikes([...lookalikes, clean]);
    }
    setNewLookalike("");
  };

  const removeLookalike = (id: string) => {
    setLookalikes(lookalikes.filter(l => l !== id));
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${snake.commonName}?`)) return;
    setLoading(true);
    try {
      await fetch("/api/edit-mode", {
        method: "POST",
        body: JSON.stringify({ action: "delete", id: snake.id }),
      });
      onClose();
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-1/2 bg-white shadow-2xl border-l border-stone-200 z-[60] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
        <div>
          <h2 className="text-lg font-bold text-stone-900">{snake.commonName}</h2>
          <p className="text-xs text-stone-500 font-mono">{snake.scientificName} • {snake.id}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-100">
        <button 
          onClick={() => setActiveTab("images")}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "images" ? "text-stone-900 border-b-2 border-stone-900" : "text-stone-400 hover:text-stone-600"}`}
        >
          Images
        </button>
        <button 
          onClick={() => setActiveTab("content")}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "content" ? "text-stone-900 border-b-2 border-stone-900" : "text-stone-400 hover:text-stone-600"}`}
        >
          Data
        </button>
        <button 
          onClick={() => setActiveTab("range")}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "range" ? "text-stone-900 border-b-2 border-stone-900" : "text-stone-400 hover:text-stone-600"}`}
        >
          Range
        </button>
      </div>

      {/* Draft Banner */}
      {(snake as any).isDraft && (
        <div className="bg-amber-50 border-b border-amber-100 p-2 px-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Draft Mode: This snake is not yet in the main database.</span>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "images" ? (
          <div className="p-4">
            {/* ... image content ... */}
            <div className="mb-6 flex gap-4">
               <div className="flex-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">Current Primary</span>
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                    {snake.images?.primary ? (
                      <Image src={`${snake.images.primary}?t=${Date.now()}`} alt="" fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-stone-300 italic text-sm">No image</div>
                    )}
                  </div>
               </div>
               <div className="w-1/3">
                  <span className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">Gallery</span>
                  <div className="grid grid-cols-2 gap-1">
                    {snake.images?.gallery?.slice(0, 4).map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-stone-200 bg-stone-100">
                        <Image src={`${img}?t=${Date.now()}`} alt="" fill className="object-cover" />
                      </div>
                    ))}
                    <div className="aspect-square rounded-md border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-400 text-[10px]">
                      +{snake.images?.gallery?.length || 0}
                    </div>
                  </div>
               </div>
            </div>

            <div className="border-t border-stone-100 pt-6">
               <h3 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2">
                 <RefreshCw className="w-4 h-4 text-stone-400" />
                 Source New Images
               </h3>
               <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
                 <ImageCandidatePicker 
                    snakeId={snake.id} 
                    embedded 
                    onClose={onRefresh} 
                  />
               </div>
            </div>
          </div>
        ) : activeTab === "content" ? (
          <div className="p-6 flex flex-col gap-6">
            {/* ... content tab ... */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Description</label>
                  {descStatus && (
                    <span className={`text-[9px] font-medium uppercase ${descStatus.includes('Error') ? 'text-red-500' : 'text-emerald-600 animate-in fade-in duration-300'}`}>
                      {descStatus}
                    </span>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleGenerate("description")}
                  disabled={loading}
                  className="h-6 text-[10px] gap-1 text-stone-600"
                >
                  {loading && descStatus?.includes("Fetching") ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Regenerate
                </Button>
              </div>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-48 p-3 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400/20 leading-relaxed"
                placeholder="Snake description..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Alternative Names (AKA)</label>
                  {akaStatus && (
                    <span className={`text-[9px] font-medium uppercase ${akaStatus.includes('Error') ? 'text-red-500' : 'text-emerald-600 animate-in fade-in duration-300'}`}>
                      {akaStatus}
                    </span>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleGenerate("AKA")}
                  disabled={loading}
                  className="h-6 text-[10px] gap-1 text-stone-600"
                >
                  {loading && akaStatus?.includes("Searching") ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
                  Fetch
                </Button>
              </div>
              <input 
                type="text"
                value={aka}
                onChange={(e) => setAka(e.target.value)}
                className="w-full p-3 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400/20"
                placeholder="Comma separated names..."
              />
            </div>

            <div className="space-y-4 border-t border-stone-100 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Misidentification</label>
                  {riskStatus && (
                    <span className={`text-[9px] font-medium uppercase ${riskStatus.includes('Error') ? 'text-red-500' : 'text-emerald-600 animate-in fade-in duration-300'}`}>
                      {riskStatus}
                    </span>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleGenerate("MisidentificationRisk")}
                  disabled={loading}
                  className="h-6 text-[10px] gap-1 text-stone-600"
                >
                  {loading && riskStatus?.includes("Analyzing") ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                  Analyze
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] text-stone-500 mb-1 block uppercase font-bold tracking-tight">Risk Level</label>
                  <select 
                    value={risk}
                    onChange={(e) => setRisk(e.target.value as "high" | "low")}
                    className="w-full p-2 text-sm border border-stone-200 rounded-lg bg-white"
                  >
                    <option value="low">Low Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-stone-500 mb-1 block uppercase font-bold tracking-tight">Lookalikes</label>
                  <div className="flex flex-wrap gap-1.5 p-2 border border-stone-200 rounded-lg bg-stone-50/30 min-h-[44px]">
                    {lookalikes.map(id => (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-stone-200 rounded text-xs font-medium text-stone-700 shadow-sm">
                        {id}
                        <button onClick={() => removeLookalike(id)} className="p-0.5 hover:bg-stone-100 rounded text-stone-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {lookalikes.length === 0 && <span className="text-[11px] text-stone-400 italic py-1 px-1">None defined</span>}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newLookalike}
                    onChange={(e) => setNewLookalike(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addLookalike()}
                    className="flex-1 p-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400/20"
                    placeholder="Add by ID (e.g. milk-snake)..."
                  />
                  <Button variant="outline" size="sm" onClick={addLookalike} className="h-9 px-3">Add</Button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-100">
               <Button 
                onClick={handleSaveFields} 
                className="w-full h-11 gap-2 bg-stone-900 hover:bg-stone-800"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Content Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="bg-stone-50 rounded-xl border border-stone-200 p-6 text-center">
              <ImageIcon className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <h3 className="text-sm font-bold text-stone-800 mb-2">Species Range Map</h3>
              <p className="text-xs text-stone-500 mb-6 max-w-xs mx-auto">
                Generate a distribution range map for this species using iNaturalist occurrence data.
              </p>
              
              <Button 
                onClick={() => handleGenerate("RangeMap")}
                disabled={loading}
                className="gap-2"
              >
                {loading && activeTab === "range" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Generate from iNaturalist
              </Button>

              {rangeStatus && (
                <p className={`mt-4 text-[11px] font-bold uppercase tracking-wider ${rangeStatus.includes('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
                  {rangeStatus}
                </p>
              )}
            </div>

            <div className="text-[10px] text-stone-400 bg-stone-50/50 rounded-lg p-4 border border-stone-100">
              <p className="font-bold uppercase mb-1">How it works</p>
              <p>This will run a script to fetch research-grade observation polygons from iNaturalist for <strong>{snake.scientificName}</strong> and save them as a GeoJSON file in <code>public/geojson/ranges/{snake.id}.json</code>.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Danger Zone */}
      <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-3">
        <Button 
          variant="outline" 
          onClick={handleDelete}
          disabled={loading}
          className="text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 h-10 px-4 gap-2 text-xs"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
        
        <Button 
          onClick={async () => {
            await handleSaveFields();
            onClose();
          }}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 font-bold uppercase tracking-wider text-[11px] gap-2 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          Done & Close
        </Button>
      </div>
      <div className="px-4 pb-4 bg-stone-50 text-[9px] text-stone-400 font-medium italic text-center">
        Run "bun run data:build" to calculate rankings and finalize structural changes.
      </div>
    </div>
  );
}
