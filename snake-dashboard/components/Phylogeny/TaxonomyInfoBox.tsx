"use client";

import { Undo2 } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";

interface TaxonomyInfoBoxProps {
  name: string;
  description: string;
  onClose: () => void;
}

export function TaxonomyInfoBox({ name, description, onClose }: TaxonomyInfoBoxProps) {
  return (
    <div className="fixed bottom-4 inset-x-4 lg:absolute lg:bottom-auto lg:inset-x-auto lg:top-4 lg:right-4 z-50 lg:z-20 w-auto lg:w-80 bg-white/90 lg:bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-8 lg:slide-in-from-right-8 duration-300">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold text-gray-800">{name}</h3>
        <button 
          onClick={onClose} 
          className="group flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors flex-shrink-0 ml-4"
          aria-label="Close"
        >
          <Kbd className="group-hover:bg-stone-300 group-hover:text-stone-900 transition-colors py-1 flex items-center justify-center">
            <Undo2 size={14} />
          </Kbd>
          <span className="hidden lg:inline">Back</span>
        </button>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
    </div>
  );
}
