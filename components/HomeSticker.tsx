/**
 * HomeSticker — decorative snake sticker for the home page background.
 *
 * Usage: drop a cutout PNG into public/images/home/, then place a sticker
 * inside the sticker section of HomeClient.tsx (inside the relative h-dvh container,
 * outside the main content z-20 div so it renders at z-30):
 *
 *   <HomeSticker
 *     id="snake-id"                     // matches the snake's id in data/snakes/index.json
 *     src="/images/home/filename.png"   // path to the cutout PNG
 *     name="Snake Name"                 // shown as curved label on hover
 *     left="5%"                         // absolute position — use left/right + top/bottom
 *     top="15%"
 *     initialRotate={-12}               // starting rotation for the fade-in animation (deg)
 *     animateRotate={-8}                // resting rotation after animation settles (deg)
 *     delay={0.2}                       // stagger delay in seconds
 *   />
 *
 * Notes:
 * - Desktop only (hidden on mobile via `hidden lg:block`)
 * - White sticker-border effect via layered drop-shadow; depth shadow appears on hover only
 * - Scale snaps back immediately on hover exit (no spring on exit)
 * - PNG images live in public/images/home/; source originals in the parent Snake Dashboard dir
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

const COMPRESSED = "var(--font-pangram-compressed), system-ui, sans-serif";

const STICKER_BORDER = `
  drop-shadow(3px 0 0 #fff)
  drop-shadow(-3px 0 0 #fff)
  drop-shadow(0 3px 0 #fff)
  drop-shadow(0 -3px 0 #fff)
  drop-shadow(2px 2px 0 #fff)
  drop-shadow(-2px -2px 0 #fff)
  drop-shadow(2px -2px 0 #fff)
  drop-shadow(-2px 2px 0 #fff)
`;

const STICKER_BORDER_WITH_SHADOW = `
  drop-shadow(3px 0 0 #fff)
  drop-shadow(-3px 0 0 #fff)
  drop-shadow(0 3px 0 #fff)
  drop-shadow(0 -3px 0 #fff)
  drop-shadow(2px 2px 0 #fff)
  drop-shadow(-2px -2px 0 #fff)
  drop-shadow(2px -2px 0 #fff)
  drop-shadow(-2px 2px 0 #fff)
  drop-shadow(0 12px 24px rgba(0,0,0,0.22))
`;

export interface HomeStickerProps {
  id: string;
  src: string;
  name: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  initialRotate: number;
  animateRotate: number;
  delay: number;
}

export function HomeSticker({
  id,
  src,
  name,
  top,
  bottom,
  left,
  right,
  initialRotate,
  animateRotate,
  delay,
}: HomeStickerProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, rotate: initialRotate }}
      animate={{ opacity: 1, rotate: animateRotate }}
      whileHover={{ scale: 1.08, transition: { type: "spring", stiffness: 400, damping: 25 } }}
      transition={{
        opacity: { duration: 0.8, delay, ease: "easeOut" },
        rotate: { duration: 0.8, delay, ease: "easeOut" },
        scale: { duration: 0 },
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="absolute pointer-events-auto cursor-pointer group select-none z-30 hidden lg:block"
      style={{ top, bottom, left, right, width: "300px", willChange: "transform" }}
    >
      <Link href={`/snakes/${id}`} className="block relative">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={name}
            className="w-full h-auto object-contain"
            style={{
              filter: hovered ? STICKER_BORDER_WITH_SHADOW : STICKER_BORDER,
              transition: "filter 0.15s ease",
            }}
          />

          {/* Curved label - visible on hover only */}
          <div className="absolute inset-x-[-10%] bottom-[-10%] h-[80px] pointer-events-none overflow-visible opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <svg viewBox="0 0 300 80" className="w-full h-full overflow-visible">
              <defs>
                <path id={`curve-${id}`} d="M 50,60 A 100,40 0 0,0 250,60" />
              </defs>
              <text
                style={{
                  fontFamily: COMPRESSED,
                  fontWeight: 800,
                  fontSize: "15px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fill: "#333",
                }}
              >
                <textPath
                  xlinkHref={`#curve-${id}`}
                  startOffset="50%"
                  textAnchor="middle"
                >
                  {name}
                </textPath>
              </text>
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
