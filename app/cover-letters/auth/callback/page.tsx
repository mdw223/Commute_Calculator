"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setAuthToken } from "@/lib/coverLetterApi";

export default function CoverLettersAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const token = params.get("token");
    if (token) {
      setAuthToken(token);
    }
    router.replace("/cover-letters");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-gray-600">Signing you in…</p>
    </main>
  );
}
