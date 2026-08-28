"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useIsDesktop } from "@/components/about/useIsDesktop";

export interface PillarData {
  emoji: string;
  title: string;
  hook: string;
  body: string;
  sourceLabel: string;
  url: string;
  imageSeed: string;
}

/** Per-card fan geometry on desktop: rotation, horizontal offset, and z-order (front-most last). */
const FAN_TRANSFORM = [
  { rotate: -10, x: -130, z: 10 },
  { rotate: 0, x: 0, z: 20 },
  { rotate: 10, x: 130, z: 10 },
];

/**
 * Renders the 3 "victim pillar" cards as an overlapping fanned hand on
 * desktop (like a dealt hand of cards — see reference), collapsing to a
 * plain stacked column on mobile where the rotation/overlap math doesn't
 * translate to a narrow viewport.
 *
 * Hovering/focusing a card straightens it, brings it to the front, and
 * lifts it; the other two dim and stay fanned back.
 */
export default function PillarFan({ pillars }: { pillars: PillarData[] }) {
  const [active, setActive] = useState<number | null>(null);
  const isDesktop = useIsDesktop();

  return (
    <div
      className={
        isDesktop
          ? "relative mx-auto flex h-[440px] max-w-5xl items-center justify-center"
          : "flex flex-col gap-6"
      }
    >
      {pillars.map((pillar, i) => {
        const isActive = active === i;
        const isDimmed = active !== null && !isActive;
        const fan = FAN_TRANSFORM[i];

        return (
          <motion.a
            key={pillar.title}
            href={pillar.url}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            initial={isDesktop ? { rotate: fan.rotate, x: fan.x, y: 24, opacity: 0 } : { opacity: 0, y: 24 }}
            whileInView={
              isDesktop
                ? { rotate: fan.rotate, x: fan.x, y: 0, opacity: 1 }
                : { opacity: 1, y: 0 }
            }
            viewport={{ once: true, margin: "-80px" }}
            animate={
              isDesktop
                ? {
                    rotate: isActive ? 0 : fan.rotate,
                    x: fan.x,
                    y: isActive ? -28 : 0,
                    scale: isActive ? 1.08 : 1,
                    opacity: isDimmed ? 0.55 : 1,
                    zIndex: isActive ? 30 : fan.z,
                  }
                : { opacity: 1 }
            }
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            whileTap={{ scale: 0.96 }}
            className={
              isDesktop
                ? "group absolute w-80 cursor-pointer overflow-hidden rounded-2xl border-2 border-emerald-900/80 bg-white shadow-[0_22px_44px_rgba(0,0,0,0.24)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                : "group relative block cursor-pointer overflow-hidden rounded-2xl border-2 border-emerald-900/80 bg-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            }
            style={isDesktop ? { zIndex: fan.z } : undefined}
          >
            <div className="relative h-48 w-full">
              <Image
                src={`https://picsum.photos/seed/${pillar.imageSeed}/640/360`}
                alt=""
                fill
                unoptimized
                className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-emerald-950/25 to-transparent" />
              <span className="absolute bottom-3 left-4 text-4xl">{pillar.emoji}</span>
              <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-sans font-bold uppercase tracking-wide text-emerald-900">
                {pillar.hook}
              </span>
            </div>

            <div className="p-6">
              <h4 className="font-serif font-bold text-xl text-neutral-900 mb-2">
                {pillar.title}
              </h4>
              <p className="font-sans text-sm text-neutral-600 leading-relaxed mb-4">
                {pillar.body}
              </p>
              <p className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-emerald-800">
                {pillar.sourceLabel}
                <ExternalLink className="h-3.5 w-3.5 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />
              </p>
            </div>
          </motion.a>
        );
      })}
    </div>
  );
}
