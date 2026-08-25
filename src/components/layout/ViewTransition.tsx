"use client";

import { useEffect, useRef } from "react";

/**
 * Wraps page content in the `#app` mount point and fades it in on mount /
 * whenever `transitionKey` changes (e.g. navigating between category pages).
 * Mirrors transitionTo() from the original vanilla-JS main.js, which faded
 * #app out, swapped innerHTML, then faded back in.
 *
 * The fade is driven entirely by a CSS animation (see `#app` / `.view-fade`
 * in globals.css) that plays whenever this element is (re)mounted, keyed on
 * `transitionKey`. Using `key` instead of JS-driven opacity state means:
 *  - content is visible (animation ends at opacity: 1) even if the
 *    animation is skipped, interrupted, or never fires — there is no
 *    intermediate JS state that can get stuck at opacity: 0.
 *  - it is immune to React Strict Mode's dev-only double-invocation of
 *    effects, since there is no effect involved in the fade itself.
 */
export default function ViewTransition({
  children,
  transitionKey,
}: {
  children: React.ReactNode;
  transitionKey: string;
}) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [transitionKey]);

  return (
    <main id="app" key={transitionKey} className="view-fade">
      {children}
    </main>
  );
}
