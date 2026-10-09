"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { retrySummary } from "@/lib/actions";
import { Button } from "./ui/button";

export function RetrySummary({ turnId }: { turnId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="xs"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await retrySummary(turnId);
          if (!r.ok) toast.error("Summary failed again", { description: r.error });
        })
      }
    >
      {pending ? "Retrying…" : "Retry"}
    </Button>
  );
}
