'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  type BuddyPosition,
  clampPosition,
  measureChromeInsets,
  readStoredPosition,
  writeStoredPosition,
} from './buddyPosition';

/** Below this much travel the gesture was a pet, not a move. */
const TAP_SLOP_PX = 8;

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// clientWidth/Height is the layout viewport a `position: fixed` element
// resolves against, and unlike innerWidth it excludes a desktop scrollbar.
function viewport() {
  const { clientWidth, clientHeight } = document.documentElement;
  return { width: clientWidth || window.innerWidth, height: clientHeight || window.innerHeight };
}

/**
 * Drags the buddy without re-rendering it.
 *
 * A `setState` per `pointermove` re-rendered the whole widget — bubble, hearts
 * chip, particles, every emotion `sx` re-serialized — up to 120×/s on an iPad,
 * and moving it by `left`/`top` relaid out a fixed element on top of that. The
 * move is a `translate3d` written straight to the node inside one rAF, and
 * state is touched twice per drag: at grab and at drop.
 */
export function useBuddyDrag(onTap: () => void) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<BuddyPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragging = useRef(false);
  /** The pointer that owns the gesture; events from any other are ignored. */
  const activePointer = useRef<number | null>(null);
  /** Set once the gesture has travelled far enough to stop being a pet. */
  const pastSlop = useRef(false);
  /** Everything the move handler needs, measured once at grab so it never reads layout mid-drag. */
  const origin = useRef({
    pointerX: 0,
    pointerY: 0,
    left: 0,
    bottom: 0,
    minDx: 0,
    maxDx: 0,
    minDy: 0,
    maxDy: 0,
  });
  const delta = useRef({ x: 0, y: 0 });
  const frame = useRef(0);
  const tapRef = useRef(onTap);
  tapRef.current = onTap;

  useIsomorphicLayoutEffect(() => {
    const stored = readStoredPosition();
    const el = rootRef.current;
    if (!stored || !el) return;
    setPos(clampPosition(stored, el.getBoundingClientRect(), viewport(), measureChromeInsets()));
  }, []);

  useEffect(() => {
    const onResize = () => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const insets = measureChromeInsets();
      setPos((p) => (p ? clampPosition(p, rect, viewport(), insets) : p));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  // The drop commits to `left`/`bottom`; the inline transform that carried the
  // drag has to go in the same paint or the buddy jumps by the drag distance.
  useIsomorphicLayoutEffect(() => {
    if (rootRef.current && !dragging.current) rootRef.current.style.transform = '';
  }, [pos]);

  /** Every way out of a gesture, so none of them can leave the drag flags set. */
  const endGesture = useCallback(() => {
    dragging.current = false;
    activePointer.current = null;
    pastSlop.current = false;
    setIsDragging(false);
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = rootRef.current;
    // A second finger would re-measure the origin off the already-transformed
    // rect, snapping the buddy back and committing the drop a drag-length off.
    if (!el || dragging.current) return;
    const rect = el.getBoundingClientRect();
    const { width, height } = viewport();
    const insets = measureChromeInsets();
    dragging.current = true;
    activePointer.current = e.pointerId;
    pastSlop.current = false;
    delta.current = { x: 0, y: 0 };
    origin.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      left: rect.left,
      bottom: height - rect.bottom,
      minDx: insets.left - rect.left,
      maxDx: width - insets.right - rect.right,
      minDy: insets.top - rect.top,
      maxDy: height - insets.bottom - rect.bottom,
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || e.pointerId !== activePointer.current) return;
    const o = origin.current;
    const rawX = e.clientX - o.pointerX;
    const rawY = e.clientY - o.pointerY;
    // Drag mode blanks the bubble, stops the idle float and dims the hearts
    // chip; entering it at grab made every pet blink for the ~100ms of the tap.
    if (!pastSlop.current) {
      if (Math.abs(rawX) + Math.abs(rawY) < TAP_SLOP_PX) return;
      pastSlop.current = true;
      setIsDragging(true);
    }
    delta.current = {
      x: Math.min(Math.max(rawX, o.minDx), o.maxDx),
      y: Math.min(Math.max(rawY, o.minDy), o.maxDy),
    };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = rootRef.current;
      if (el) el.style.transform = `translate3d(${delta.current.x}px, ${delta.current.y}px, 0)`;
    });
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // No matching pointerdown (the hearts chip swallowed it, a second pointer,
      // a lost capture) means origin is stale, and a tap read off it would spend
      // the day's pet award.
      if (!dragging.current || e.pointerId !== activePointer.current) return;
      const o = origin.current;
      const { x, y } = delta.current;
      const wasDrag = pastSlop.current;
      endGesture();

      if (!wasDrag) {
        if (rootRef.current) rootRef.current.style.transform = '';
        tapRef.current();
        return;
      }

      const dropped = { left: o.left + x, bottom: o.bottom - y };
      setPos(dropped);
      writeStoredPosition(dropped);
    },
    [endGesture],
  );

  // A system gesture (iOS edge swipe, notification pull) cancels the touch and
  // no pointerup arrives. Without this the buddy is stuck in drag mode — mute,
  // unanimated, its stories unreachable — and the next grab measures off the
  // stale transform and teleports it. Nothing commits: it was never released.
  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || e.pointerId !== activePointer.current) return;
      endGesture();
      if (rootRef.current) rootRef.current.style.transform = '';
    },
    [endGesture],
  );

  return {
    rootRef,
    pos,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
