"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import CoverLettersSubnav from "@/components/coverletters/CoverLettersSubnav";
import { useCoverLetters } from "@/components/coverletters/CoverLettersProvider";
import { createConversation, getGoogleLoginUrl, listConversations } from "@/lib/coverLetterApi";
import type { Conversation } from "@/types/coverLetters";

export default function CoverLettersDashboard() {
  const router = useRouter();
  const { user, documents, loading, error, signOut } = useCoverLetters();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [jobDescription, setJobDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listConversations();
        if (!cancelled) setConversations(list);
      } finally {
        if (!cancelled) setConversationsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const defaultResume = documents.find((d) => d.is_default);

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      setSubmitError("Paste the job description first.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createConversation(jobDescription.trim());
      router.push(`/cover-letters/chat/${result.conversation.id}`);
    } catch {
      setSubmitError("Couldn't start that cover letter. Try again in a moment.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav />
        <main className="flex-1 p-8 font-mono text-sm">Loading…</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav />
        <main className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
          <h1 className="font-display text-3xl font-bold text-center">Cover Letter Studio</h1>
          <p className="text-center max-w-md text-muted">
            Upload your resume once, paste a job description, and let AI draft a tailored
            cover letter you can download as a Word document.
          </p>
          <a
            href={getGoogleLoginUrl()}
            className="border-3 border-ink bg-cta px-6 py-3 font-mono text-sm uppercase shadow-brutal hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
          >
            Sign in with Google
          </a>
          {error && <p className="text-headline font-mono text-sm">{error}</p>}
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <header className="border-b-3 border-ink bg-surface px-4 py-4">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Cover Letter Studio</h1>
            <p className="font-mono text-xs text-muted">{user.email}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <CoverLettersSubnav />
            <button
              type="button"
              onClick={signOut}
              className="border-2 border-ink px-3 py-1 font-mono text-xs uppercase text-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 space-y-8">
        {documents.length === 0 ? (
          <section className="border-3 border-ink border-dashed p-6 text-center space-y-2">
            <p className="font-mono text-sm">Upload a resume before generating a cover letter.</p>
            <Link href="/cover-letters/documents" className="text-sm underline inline-block">
              Go to Resumes →
            </Link>
          </section>
        ) : (
          <section className="border-3 border-ink p-6 shadow-brutal space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-mono text-xs uppercase tracking-widest">New cover letter</h2>
              {defaultResume ? (
                <span className="font-mono text-xs text-muted">
                  Using resume: <strong>{defaultResume.filename}</strong>{" "}
                  <Link href="/cover-letters/documents" className="underline">
                    change
                  </Link>
                </span>
              ) : (
                <span className="font-mono text-xs text-headline">
                  No default resume set —{" "}
                  <Link href="/cover-letters/documents" className="underline">
                    choose one
                  </Link>
                </span>
              )}
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here…"
              rows={10}
              className="w-full border-2 border-ink px-3 py-2 font-mono text-sm"
            />
            {submitError && <p className="font-mono text-xs text-headline">{submitError}</p>}
            <button
              type="button"
              disabled={submitting || !defaultResume}
              onClick={handleGenerate}
              className="border-2 border-ink bg-cta px-4 py-2 font-mono text-xs uppercase disabled:opacity-50 hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
            >
              {submitting ? "Generating…" : "Generate cover letter"}
            </button>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest">Your cover letters</h2>
          {conversationsLoading ? (
            <p className="font-mono text-xs text-muted">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="font-mono text-xs text-muted">
              No cover letters yet — generate your first one above.
            </p>
          ) : (
            <div className="space-y-2">
              {conversations.map((c) => (
                <Link
                  key={c.id}
                  href={`/cover-letters/chat/${c.id}`}
                  className="block border-2 border-ink px-4 py-3 hover:bg-cta/10 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-sm">{c.title}</span>
                    <span className="font-mono text-xs text-muted uppercase">{c.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
