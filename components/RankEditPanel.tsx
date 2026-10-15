"use client";

import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { X, RefreshCw, CheckCircle2 } from "lucide-react";
import { ImageCandidatePicker } from "./ImageCandidatePicker";
import type { Snake } from "@/lib/types";

interface RankEditPanelProps {
  snake: Snake;
  onClose: () => void;
  onRefresh: () => void;
}

export function RankEditPanel({ snake, onClose, onRefresh }: RankEditPanelProps) {
  const [selectionCount, setSelectionCount] = useState(0);
  const submitTrigger = useRef<(() => Promise<void>) | null>(null);

  const handleApply = async () => {
    if (submitTrigger.current) {
      await submitTrigger.current();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-1/2 bg-white shadow-2xl border-l border-stone-200 z-[60] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
        <div>
          <h2 className="text-lg font-bold text-stone-900">{snake.commonName}</h2>
          <p className="text-xs text-stone-500 font-mono uppercase tracking-widest">{snake.scientificName} • Image Curation</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 text-stone-800">
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
      </div>

      <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-3">
        <Button
          onClick={handleApply}
          className={`w-full h-11 font-bold uppercase tracking-widest text-[11px] gap-2 shadow-md transition-all ${
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
