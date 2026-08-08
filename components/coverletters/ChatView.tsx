"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { useCoverLetters } from "@/components/coverletters/CoverLettersProvider";
import { getConversation, getCoverLetterDownloadUrl, sendMessage } from "@/lib/coverLetterApi";
import type { ChatMessage, ConversationDetail } from "@/types/coverLetters";

export default function ChatView({ conversationId }: { conversationId: string }) {
  const { user, loading: userLoading } = useCoverLetters();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const detail = await getConversation(conversationId);
        if (!cancelled) setConversation(detail);
      } catch {
        if (!cancelled) setLoadError("Couldn't load this cover letter.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  const handleDownload = async (coverLetterId: string) => {
    setDownloadingId(coverLetterId);
    try {
      const url = await getCoverLetterDownloadUrl(coverLetterId);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !conversation) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setSendError(null);
    try {
      const result = await sendMessage(conversation.id, content);
      setConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, ...result.messages] } : prev
      );
    } catch {
      setSendError("Message failed to send. Try again.");
    } finally {
      setSending(false);
    }
  };

  if (userLoading || loading) {
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
        <main className="flex-1 p-8 font-mono text-sm">
          <Link href="/cover-letters" className="underline">
            Sign in to view this cover letter
          </Link>
        </main>
      </div>
    );
  }

  if (loadError || !conversation) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav />
        <main className="flex-1 p-8 font-mono text-sm space-y-2">
          <p>{loadError ?? "Cover letter not found."}</p>
          <Link href="/cover-letters" className="underline">
            ← Back
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <header className="border-b-3 border-ink bg-surface px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link href="/cover-letters" className="font-mono text-xs uppercase hover:underline">
            ← All cover letters
          </Link>
          <h1 className="font-mono text-xs uppercase text-muted truncate">{conversation.title}</h1>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 flex flex-col gap-4">
        <div className="flex-1 space-y-4">
          {conversation.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onDownload={handleDownload}
              downloading={downloadingId === message.cover_letter_id}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="sticky bottom-4 space-y-2">
          {sendError && <p className="font-mono text-xs text-headline">{sendError}</p>}
          <div className="border-3 border-ink bg-surface p-3 shadow-brutal flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask for edits, add details, or paste another job description…"
              rows={2}
              className="flex-1 resize-none font-mono text-sm outline-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="border-2 border-ink bg-cta px-4 py-2 font-mono text-xs uppercase disabled:opacity-50 self-end"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function MessageBubble({
  message,
  onDownload,
  downloading,
}: {
  message: ChatMessage;
  onDownload: (coverLetterId: string) => void;
  downloading: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] border-2 border-ink px-4 py-3 whitespace-pre-wrap text-sm ${
          isUser ? "bg-cta/30" : "bg-surface"
        }`}
      >
        {message.content}
        {message.cover_letter_id && (
          <button
            type="button"
            onClick={() => onDownload(message.cover_letter_id!)}
            disabled={downloading}
            className="mt-3 block border-2 border-ink bg-cta px-3 py-1.5 font-mono text-xs uppercase disabled:opacity-50 hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
          >
            {downloading ? "Opening…" : "Download .docx"}
          </button>
        )}
      </div>
    </div>
  );
}
