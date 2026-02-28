"use client";

import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { 
  X, RefreshCw, CheckCircle2, Trash2, AlertCircle, Loader2
} from "lucide-react";
import { ImageCandidatePicker } from "./ImageCandidatePicker";
import type { Snake } from "@/lib/types";

interface RankEditPanelProps {
  snake: Snake;
  onClose: () => void;
  onRefresh: () => void;
}

export function RankEditPanel({ snake, onClose, onRefresh }: RankEditPanelProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectionCount, setSelectionCount] = useState(0);
  const submitTrigger = useRef<(() => Promise<void>) | null>(null);

  const handleApply = async () => {
    if (submitTrigger.current) {
      await submitTrigger.current();
    } else {
      onClose();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/edit-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: snake.id }),
      });
      if (res.ok) {
        onClose();
        onRefresh();
      }
    } catch (e) {
      console.error("Failed to delete snake:", e);
      alert("Failed to delete snake. Check server logs.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-1/2 bg-white shadow-2xl border-l border-stone-200 z-[60] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
        <div>
          <h2 className="text-lg font-bold text-stone-900">{snake.commonName}</h2>
          <p className="text-xs text-stone-500 font-mono uppercase tracking-widest">{snake.scientificName} • Image Curation</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Workspace */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 text-stone-800">
        {showDeleteConfirm ? (
          <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-8 text-center animate-in fade-in zoom-in duration-200">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-red-900 mb-2">Delete this species?</h3>
            <p className="text-sm text-red-700 mb-8 max-w-sm mx-auto">
              Are you sure you want to remove <strong>{snake.commonName}</strong>? This will add it to the deleted list and remove it from all rankings immediately.
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                className="h-11 px-6 border-red-200 text-red-700 hover:bg-white"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-11 px-8 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-[11px] gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Yes, Delete Snake
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-4">
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">Primary Identity</span>
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shadow-inner">
                    {snake.images?.primary ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={`${snake.images.primary}?t=${Date.now()}`} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-stone-300 italic text-sm">No primary image</div>
                    )}
                  </div>
                </div>
                <div className="w-1/3">
                  <span className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">Gallery Preview</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {snake.images?.gallery?.slice(0, 4).map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-stone-200 bg-stone-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={`${img}?t=${Date.now()}`} 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-cover" 
                        />
                      </div>
                    ))}
                    {(!snake.images?.gallery || snake.images.gallery.length === 0) && (
                      <div className="col-span-2 aspect-[2/1] rounded-md border border-dashed border-stone-200 flex items-center justify-center text-stone-300 text-[10px] italic">
                        Gallery empty
                      </div>
                    )}
                  </div>
                  {snake.images?.gallery && snake.images.gallery.length > 0 && (
                    <div className="mt-2 text-right">
                      <span className="text-[10px] font-bold text-stone-400">{snake.images.gallery.length} images total</span>
                    </div>
                  )}
                </div>
            </div>

            <div className="border-t border-stone-100 pt-6">
                <h3 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2 text-stone-800">
                  <RefreshCw className="w-4 h-4 text-stone-400" />
                  Source New Images
                </h3>
                <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden min-h-[400px]">
                  <ImageCandidatePicker 
                    snakeId={snake.id} 
                    embedded 
                    onClose={onRefresh}
                    onSelectionsChange={setSelectionCount}
                    submitTrigger={submitTrigger}
                  />
                </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-3">
        {!showDeleteConfirm && (
          <Button 
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 h-11 px-4 gap-2 text-[10px] font-bold uppercase tracking-widest"
          >
            <Trash2 className="w-4 h-4" />
            Delete Species
          </Button>
        )}
        
        <Button 
          onClick={handleApply}
          disabled={showDeleteConfirm}
          className={`flex-1 h-11 font-bold uppercase tracking-widest text-[11px] gap-2 shadow-md transition-all ${
            selectionCount > 0 
              ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
              : "bg-stone-900 hover:bg-stone-800 text-white"
          }`}
        >
          {selectionCount > 0 ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Apply {selectionCount} Selections & Finish
            </>
          ) : (
            <>
              <X className="w-4 h-4" />
              Finish Curation
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
