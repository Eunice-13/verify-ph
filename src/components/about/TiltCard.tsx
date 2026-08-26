"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";

/**
 * Anchor wrapper that adds a cursor-tracking 3D tilt + glowing border
 * highlight that follows the pointer, on top of a standard elevate-on-hover.
 * Used for the /about bento stat + pillar cards only.
 *
 * The glow is a radial-gradient mask positioned at the live cursor
 * coordinates (relative to the card), layered above the card's own
 * background via a pseudo-overlay div — no new color tokens, just the
 * existing emerald accent at low opacity.
 */
export default function TiltCard({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });

  const glow = useMotionTemplate`radial-gradient(220px circle at ${mouseX}px ${mouseY}px, rgba(6, 95, 70, 0.22), transparent 70%)`;

  function handleMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseX.set(x);
    mouseY.set(y);

    // Map cursor position within the card to a small rotation (max ~6deg).
    const percentX = x / rect.width - 0.5;
    const percentY = y / rect.height - 0.5;
    rotateY.set(percentX * 12);
    rotateX.set(percentY * -12);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`group relative block overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white/80 backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${className}`}
    >
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glow }}
      />
      <span className="relative z-10 flex h-full flex-col">{children}</span>
    </motion.a>
  );
}
