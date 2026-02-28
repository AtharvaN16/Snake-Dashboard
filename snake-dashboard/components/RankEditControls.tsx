"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { RefreshCw, Trash2, Image as ImageIcon, PlusCircle, Sparkles, AlertTriangle } from "lucide-react";
import { ImageCandidatePicker } from "./ImageCandidatePicker";

interface RankEditControlsProps {
  snakeId: string;
  onRefresh: () => void;
}

export function RankEditControls({ snakeId, onRefresh }: RankEditControlsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${snakeId} from the database? (This will add it to deletedIds in manualEdits.json)`)) return;
    setLoading(true);
    try {
      await fetch("/api/edit-mode", {
        method: "POST",
        body: JSON.stringify({ action: "delete", id: snakeId }),
      });
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (field: "description" | "AKA") => {
    setLoading(true);
    try {
      const res = await fetch("/api/edit-mode", {
        method: "POST",
        body: JSON.stringify({ action: `generate${field}`, id: snakeId }),
      });
      const data = await res.json();
      if (data.success) {
        // Now save the result to manualEdits fieldOverrides
        await fetch("/api/edit-mode", {
          method: "POST",
          body: JSON.stringify({ 
            action: "updateFields", 
            id: snakeId, 
            data: field === "description" ? { description: data.description } : { otherCommonNames: data.otherCommonNames } 
          }),
        });
        alert(`Successfully regenerated ${field}. Run "bun run data:build" to apply permanently.`);
        onRefresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 border-l border-stone-100 bg-stone-50/50 min-w-[120px]">
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tight mb-1">Images</span>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-[10px] gap-1 px-2 justify-start"
          onClick={() => setShowPicker(true)}
        >
          <RefreshCw className="w-3 h-3" />
          Primary/Gal
        </Button>
      </div>

      <div className="flex flex-col gap-1 mt-2">
        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tight mb-1">Data</span>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-[10px] gap-1 px-2 justify-start"
          onClick={() => handleGenerate("description")}
        >
          <Sparkles className="w-3 h-3" />
          Desc
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-[10px] gap-1 px-2 justify-start"
          onClick={() => handleGenerate("AKA")}
        >
          <PlusCircle className="w-3 h-3" />
          AKA
        </Button>
      </div>

      <div className="flex flex-col gap-1 mt-2">
         <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tight mb-1">Admin</span>
         <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-[10px] gap-1 px-2 justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleDelete}
          disabled={loading}
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </Button>
      </div>

      {showPicker && (
        <ImageCandidatePicker 
          snakeId={snakeId} 
          onClose={() => {
            setShowPicker(false);
            onRefresh();
          }} 
        />
      )}
    </div>
  );
}
