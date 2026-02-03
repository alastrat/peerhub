"use client";

import { useEffect } from "react";
import AOS from "aos";

export function AOSProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease-out",
    });
  }, []);

  return <>{children}</>;
}
