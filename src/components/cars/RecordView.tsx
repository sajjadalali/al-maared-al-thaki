"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/interest";

/** Notes in this browser that the visitor opened this car's page (see lib/interest). */
export function RecordView({ id }: { id: string }) {
  useEffect(() => recordView(id), [id]);
  return null;
}
