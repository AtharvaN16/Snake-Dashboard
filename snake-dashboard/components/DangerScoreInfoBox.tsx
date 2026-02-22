"use client";

import { Beaker, Activity, Zap, Users, ShieldAlert, X } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";

interface DangerScoreInfoBoxProps {
  onClose: () => void;
}

export function DangerScoreInfoBox({ onClose }: DangerScoreInfoBoxProps) {
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-30 w-auto sm:w-[460px] max-h-[78vh] overflow-y-auto bg-white/95 backdrop-blur-sm border border-stone-200 rounded-2xl shadow-2xl p-5 sm:p-6 animate-in slide-in-from-bottom-8 duration-300">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-xl font-black text-[#2c2c2c] tracking-tight">How the Danger Score Works</h3>
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wider mt-1">v5 model, 0-100 scale</p>
        </div>
        <button
          onClick={onClose}
          className="group flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <Kbd className="group-hover:bg-stone-300 group-hover:text-stone-900 transition-colors py-1 flex items-center justify-center min-w-[24px]">
            <X size={14} />
          </Kbd>
          <span className="font-semibold">Close</span>
        </button>
      </div>

      <div className="space-y-5">
        <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500 mb-2">Formula (at a glance)</p>
          <div className="text-[13px] leading-relaxed text-stone-700 space-y-1">
            <p>
              <span className="font-semibold text-stone-900">Intrinsic =</span> 55% Lethality + 45% Clinical
            </p>
            <p>
              <span className="font-semibold text-stone-900">Final Score =</span> Intrinsic x Speed x Delivery x Encounter
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">1) Core danger sources</p>
          <div className="rounded-xl border border-stone-100 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-rose-600">
                <Beaker size={16} strokeWidth={2.5} />
                <h4 className="font-bold text-xs uppercase tracking-wide">Lethality</h4>
              </div>
              <span className="text-xs font-semibold text-rose-700">55%</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Lethal doses per bite for a 70kg human. This combines LD50 potency + venom yield into one biologically correct signal.
            </p>
          </div>

          <div className="rounded-xl border border-stone-100 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-amber-600">
                <Activity size={16} strokeWidth={2.5} />
                <h4 className="font-bold text-xs uppercase tracking-wide">Clinical Severity</h4>
              </div>
              <span className="text-xs font-semibold text-amber-700">45%</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Untreated fatality ranges + WHO medical importance, with morbidity floors so severe non-fatal outcomes still score meaningfully.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">2) Real-world multipliers</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-stone-100 p-3">
              <div className="flex items-center gap-2 mb-1.5 text-yellow-600">
                <Zap size={15} strokeWidth={2.5} />
                <h4 className="font-bold text-[11px] uppercase">Speed</h4>
              </div>
              <p className="text-[11px] text-stone-600 leading-snug mb-2">How fast symptoms escalate.</p>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full w-[67%] bg-gradient-to-r from-yellow-300 to-yellow-600" />
              </div>
              <p className="mt-1.5 text-[10px] font-medium text-stone-500">Range: 0.8x to 1.2x</p>
            </div>

            <div className="rounded-xl border border-stone-100 p-3">
              <div className="flex items-center gap-2 mb-1.5 text-violet-600">
                <ShieldAlert size={15} strokeWidth={2.5} />
                <h4 className="font-bold text-[11px] uppercase">Delivery</h4>
              </div>
              <p className="text-[11px] text-stone-600 leading-snug mb-2">Rear-fanged inefficiency penalty.</p>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-gradient-to-r from-violet-300 to-violet-600" />
              </div>
              <p className="mt-1.5 text-[10px] font-medium text-stone-500">0.5x penalty for selected rear-fanged snakes</p>
            </div>
          </div>

          <div className="rounded-xl border border-stone-100 p-3">
            <div className="flex items-center gap-2 mb-1.5 text-sky-700">
              <Users size={16} strokeWidth={2.5} />
              <h4 className="font-bold text-xs uppercase tracking-wide">Encounter Frequency</h4>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mb-2">
              Final public-risk filter. Common snakes in human environments rank higher than equally toxic but rarely encountered species.
            </p>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full w-[70%] bg-gradient-to-r from-sky-300 to-sky-700" />
            </div>
            <p className="mt-1.5 text-[10px] font-medium text-stone-500">Range: 0.6x to 1.0x</p>
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500 mb-2">Why this structure?</p>
          <p className="text-xs text-stone-600 leading-relaxed">
            The model treats lethality and clinical outcomes as true danger sources. Speed, delivery, and encounter are multipliers, so they amplify existing danger but cannot create danger on their own.
          </p>
        </section>
      </div>

      <div className="mt-5 pt-3 border-t border-stone-100">
        <p className="text-[10px] text-stone-500 leading-relaxed text-center">
          Summary: dangerous biology first, then real-world exposure modifiers.
        </p>
      </div>
    </div>
  );
}
