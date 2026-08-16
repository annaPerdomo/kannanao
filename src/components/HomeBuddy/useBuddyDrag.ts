'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  type BuddyPosition,
  clampPosition,
  measureChromeInsets,
  readStoredPosition,
  writeStoredPosition,
} from './buddyPosition';

const TAP_SLOP_PX = 8;

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// clientWidth/Height is the layout viewport a `position: fixed` element
// resolves against, and unlike innerWidth it excludes a desktop scrollbar.
function viewport() {
  const { clientWidth, clientHeight } = document.documentElement;
  return { width: clientWidth || window.innerWidth, height: clientHeight || window.innerHeight };
}

/** Moves by `translate3d` in one rAF: a `setState` per `pointermove` re-rendered the widget every frame. */
export function useBuddyDrag(onTap: () => void) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<BuddyPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragging = useRef(false);
  const activePointer = useRef<number | null>(null);
  const pastSlop = useRef(false);
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
    // A second finger re-measures origin off the already-transformed rect and
    // commits the drop a drag-length off.
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
    // Drag mode blanks the bubble, so entering it at grab rather than past the
    // slop makes every pet blink.
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
      // No matching pointerdown (the hearts chip swallows it) leaves origin
      // stale, and a tap read off it spends the day's pet.
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

  // An iOS system gesture (edge swipe, notification pull) cancels the touch and
  // no pointerup arrives, stranding the buddy in drag mode.
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
