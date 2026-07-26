"use client";

import { useEffect, useState } from "react";

// Returns false during SSR and the first client render, then true after mount.
// Use this to gate components whose output depends on browser-only state
// (e.g. wagmi's useAccount) so server and client render identically.
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  return mounted;
}
