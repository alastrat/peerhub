"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type AnimationType =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "fade"
  | "zoom-in"
  | "zoom-out";

interface AnimatedElementProps {
  children: React.ReactNode;
  animation?: AnimationType;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
}

const animationStyles: Record<AnimationType, { initial: string; animate: string }> = {
  "fade-up": {
    initial: "opacity-0 translate-y-8",
    animate: "opacity-100 translate-y-0",
  },
  "fade-down": {
    initial: "opacity-0 -translate-y-8",
    animate: "opacity-100 translate-y-0",
  },
  "fade-left": {
    initial: "opacity-0 translate-x-8",
    animate: "opacity-100 translate-x-0",
  },
  "fade-right": {
    initial: "opacity-0 -translate-x-8",
    animate: "opacity-100 translate-x-0",
  },
  fade: {
    initial: "opacity-0",
    animate: "opacity-100",
  },
  "zoom-in": {
    initial: "opacity-0 scale-95",
    animate: "opacity-100 scale-100",
  },
  "zoom-out": {
    initial: "opacity-0 scale-105",
    animate: "opacity-100 scale-100",
  },
};

export function AnimatedElement({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 600,
  className,
  once = true,
}: AnimatedElementProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          if (once) {
            observer.unobserve(entry.target);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay, once]);

  const styles = animationStyles[animation];

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all",
        isVisible ? styles.animate : styles.initial,
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {children}
    </div>
  );
}
