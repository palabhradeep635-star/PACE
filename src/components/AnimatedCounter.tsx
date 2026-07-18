/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { useMotionValue, useTransform, animate } from 'motion/react';

interface AnimatedCounterProps {
  value: number;
  duration?: number; // duration in seconds
}

export default function AnimatedCounter({ value, duration = 1.0 }: AnimatedCounterProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Animate the motion value with an elegant easeOut/expo curve
    const controls = animate(count, value, {
      duration: duration,
      ease: [0.16, 1, 0.3, 1], // Custom ultra-premium cubic easeOut
    });
    return () => controls.stop();
  }, [value, duration, count]);

  useEffect(() => {
    // Directly mutate DOM textContent to avoid React state re-render overhead
    const unsubscribe = rounded.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = latest.toLocaleString();
      }
    });
    return () => unsubscribe();
  }, [rounded]);

  return <span ref={ref}>0</span>;
}
