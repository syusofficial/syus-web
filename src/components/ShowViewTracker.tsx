"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/recentViews";

export default function ShowViewTracker({ showId }: { showId: string }) {
  useEffect(() => { recordView(showId); }, [showId]);
  return null;
}
