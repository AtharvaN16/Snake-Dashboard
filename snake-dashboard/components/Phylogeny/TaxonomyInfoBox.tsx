"use client";

import { X } from 'lucide-react';

interface TaxonomyInfoBoxProps {
  name: string;
  description: string;
  onClose: () => void;
}

export function TaxonomyInfoBox({ name, description, onClose }: TaxonomyInfoBoxProps) {
  return (
    <div className="absolute top-4 right-4 z-20 w-80 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-4 animate-in slide-in-from-right-8 duration-300">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-bold text-gray-800 mb-2">{name}</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
      <p className="text-sm text-gray-700">{description}</p>
    </div>
  );
}
