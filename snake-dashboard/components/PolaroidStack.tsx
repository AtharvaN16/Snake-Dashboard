"use client";

import Image from "next/image";
import { useMemo, useState, type KeyboardEvent } from "react";

type PolaroidAttribution = {
  photographer?: string;
  source: string;
  license: string;
  sourceUrl?: string;
  licenseUrl?: string;
};

interface PolaroidStackProps {
  images: string[];
  caption: string;
  attributions: PolaroidAttribution[];
}

const CARD_ROTATION_DEG = 7;

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function nextIndexAfterShuffle(current: number, total: number): number {
  if (total <= 1) return current;
  return (current + 1) % total;
}

export function PolaroidStack({ images, caption, attributions }: PolaroidStackProps) {
  if (images.length === 0) return null;

  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const activeSrc = images[activeIndex];
  const activeAttribution = attributions[activeIndex];
  const pendingSrc = pendingIndex !== null ? images[pendingIndex] : null;

  const peekingIndexes = useMemo(() => {
    if (images.length <= 1) return [] as number[];
    return [1, 2, 3]
      .map((offset) => mod(activeIndex + offset, images.length))
      .slice(0, Math.min(3, images.length - 1));
  }, [activeIndex, images.length]);

  const handleShuffle = () => {
    if (images.length <= 1 || isShuffling) return;
    const next = nextIndexAfterShuffle(activeIndex, images.length);
    setPendingIndex(next);
    setIsShuffling(true);
    window.setTimeout(() => {
      setActiveIndex(next);
    }, 150);
    window.setTimeout(() => {
      setIsShuffling(false);
      setPendingIndex(null);
    }, 340);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleShuffle();
    }
  };

  return (
    <div className="relative z-10 aspect-[10/9] w-full">
      <div className="absolute inset-0 flex items-center justify-center">
        {peekingIndexes.map((idx, layer) => (
          <div
            key={`peek-${idx}-${layer}`}
            className="pointer-events-none absolute h-[88%] w-[90%] bg-white"
            style={{
              transform: `translate(${10 + layer * 9}px, ${18 + layer * 11}px) rotate(${CARD_ROTATION_DEG - 1.25 + layer * 0.7}deg)`,
              transformOrigin: "50% 8%",
              padding: "5% 4.5% 18% 4.5%",
              boxShadow: "0 10px 20px rgba(0, 0, 0, 0.12)",
              zIndex: 1 + layer,
              opacity: 0.7 - layer * 0.12,
            }}
          >
            <div className="h-full w-full bg-stone-100" />
          </div>
        ))}

        <div
          role="button"
          tabIndex={0}
          aria-label="Shuffle snake photo"
          onClick={handleShuffle}
          onKeyDown={handleKeyDown}
          className={`polaroid-card group absolute h-[90%] w-[92%] cursor-pointer select-none bg-white outline-none ${isShuffling ? "polaroid-shuffling" : ""}`}
          style={{
            transform: `rotate(${CARD_ROTATION_DEG}deg)`,
            transformOrigin: "50% 8%",
            padding: "5% 4.5% 18% 4.5%",
            boxShadow: "0 14px 30px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08)",
            zIndex: 10,
          }}
        >
          <div
            className="relative h-full w-full overflow-hidden bg-stone-200"
            style={{ boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.06)" }}
          >
            <Image
              src={activeSrc}
              alt={caption}
              fill
              className={`object-cover transition-opacity duration-220 ease-out ${isShuffling ? "opacity-0" : "opacity-100"}`}
              sizes="(max-width: 1024px) 90vw, 420px"
              priority
            />
            {pendingSrc && (
              <Image
                src={pendingSrc}
                alt={caption}
                fill
                className={`object-cover transition-opacity duration-220 ease-out ${isShuffling ? "opacity-100" : "opacity-0"}`}
                sizes="(max-width: 1024px) 90vw, 420px"
              />
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-black/55 via-black/20 to-transparent opacity-0 transition-opacity duration-250 group-hover:opacity-100 group-focus-within:opacity-100" />
            <div className="absolute inset-x-2 bottom-2 text-[10px] leading-tight text-white/90 opacity-0 transition-opacity duration-250 group-hover:opacity-100 group-focus-within:opacity-100">
              <span className="pointer-events-none">Photo: {activeAttribution?.photographer || "Unknown"} </span>
              <span className="pointer-events-none">· Source: </span>
              {activeAttribution?.sourceUrl ? (
                <a
                  href={activeAttribution.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="pointer-events-auto underline hover:text-white"
                >
                  {activeAttribution.source}
                </a>
              ) : (
                <span className="pointer-events-none">{activeAttribution?.source}</span>
              )}
              <span className="pointer-events-none"> · License: </span>
              {activeAttribution?.licenseUrl ? (
                <a
                  href={activeAttribution.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="pointer-events-auto underline hover:text-white"
                >
                  {activeAttribution.license}
                </a>
              ) : (
                <span className="pointer-events-none">{activeAttribution?.license}</span>
              )}
            </div>
          </div>

          <Image
            src="/images/ui/red-pin.svg"
            alt=""
            width={40}
            height={50}
            className="pointer-events-none absolute left-1/2 top-[6%] h-auto w-[36px] -translate-x-1/2 -translate-y-1/2"
          />

          <p
            className="pointer-events-none absolute left-1/2 top-[84.8%] -translate-x-1/2 -translate-y-1/2 text-center italic text-black/80"
            style={{ fontSize: "clamp(11px, 1.1vw, 16px)", lineHeight: 1 }}
          >
            {caption}
          </p>

        </div>
      </div>

      <style jsx>{`
        .polaroid-card {
          animation: polaroid-enter 420ms ease-out;
          transition: transform 180ms linear;
        }
        .polaroid-shuffling {
          animation: polaroid-shuffle 340ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .polaroid-card:hover:not(.polaroid-shuffling),
        .polaroid-card:focus-within:not(.polaroid-shuffling) {
          transform-origin: 28% 8%;
          transform: rotate(${CARD_ROTATION_DEG}deg) translateX(-8px);
        }
        @keyframes polaroid-enter {
          0% {
            transform: rotate(${CARD_ROTATION_DEG - 2.4}deg) translateY(-6px) scale(0.985);
          }
          60% {
            transform: rotate(${CARD_ROTATION_DEG + 1.3}deg) translateY(0) scale(1.005);
          }
          100% {
            transform: rotate(${CARD_ROTATION_DEG}deg) translateY(0) scale(1);
          }
        }
        @keyframes polaroid-shuffle {
          0% {
            transform: rotate(${CARD_ROTATION_DEG}deg) translateY(0) scale(1);
          }
          45% {
            transform: rotate(${CARD_ROTATION_DEG - 0.75}deg) translateY(-2px) scale(0.998);
          }
          75% {
            transform: rotate(${CARD_ROTATION_DEG + 0.45}deg) translateY(0) scale(1.001);
          }
          100% {
            transform: rotate(${CARD_ROTATION_DEG}deg) translateY(0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .polaroid-card,
          .polaroid-shuffling {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
