import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeNext } from "@/lib/gate";
import { openGate } from "./actions";
import { FocusPassword } from "./focus-password";

export const metadata: Metadata = { title: "Password" };

/** The front door of a deployed Whim: one field, one button, no account. */
export default function GatePage({ searchParams }: PageProps<"/gate">) {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-10">
      {/* The form itself is static; only the "wrong password" line and the return path read the URL. */}
      <Suspense fallback={<GateForm wrong={false} next="/" />}>
        <GateFormFromUrl searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function GateFormFromUrl({ searchParams }: { searchParams: PageProps<"/gate">["searchParams"] }) {
  const params = await searchParams;
  const wrong = params.wrong === "1";
  const next = safeNext(typeof params.next === "string" ? params.next : "/");
  return <GateForm wrong={wrong} next={next} />;
}

function GateForm({ wrong, next }: { wrong: boolean; next: string }) {
  return (
    <form action={openGate} className="flex w-full max-w-xs flex-col gap-5">
      <Logo />
      <div className="flex flex-col gap-2">
        <label htmlFor="gate-password" className="sr-only">
          Password
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="gate-password"
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            autoFocus
            required
            aria-invalid={wrong || undefined}
            aria-describedby={wrong ? "gate-error" : undefined}
          />
          <Button type="submit" className="shrink-0">
            Log in
          </Button>
        </div>
        <p id="gate-error" role="alert" aria-live="polite" className="min-h-5 text-sm text-destructive">
          {wrong ? "That password did not match." : ""}
        </p>
      </div>
      <input type="hidden" name="next" value={next} />
      <FocusPassword id="gate-password" />
    </form>
  );
}
