"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, GATE_MAX_AGE, gateCookieValue, safeNext } from "@/lib/gate";

/** Checks the password. Right: set the cookie and go where the visitor was headed. Wrong: back to the gate, saying so. */
export async function openGate(formData: FormData) {
  const expected = process.env.WHIM_PASSWORD;
  const next = safeNext(String(formData.get("next") ?? "/"));
  if (!expected) redirect(next);
  const given = String(formData.get("password") ?? "");
  if (given !== expected) redirect(`/gate?wrong=1&next=${encodeURIComponent(next)}`);
  const jar = await cookies();
  jar.set(GATE_COOKIE, await gateCookieValue(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GATE_MAX_AGE,
  });
  redirect(next);
}
