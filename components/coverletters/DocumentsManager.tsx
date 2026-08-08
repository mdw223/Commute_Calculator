"use client";

import { useRef, useState } from "react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import CoverLettersSubnav from "@/components/coverletters/CoverLettersSubnav";
import { useCoverLetters } from "@/components/coverletters/CoverLettersProvider";
import { getDocumentDownloadUrl } from "@/lib/coverLetterApi";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsManager() {
  const { user, documents, loading, uploadResume, removeDocument, makeDefaultDocument } =
    useCoverLetters();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadResume(file);
    } catch {
      setUploadError("Upload failed. Make sure it's a PDF, DOCX, or TXT file under 10MB.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleView = async (id: string) => {
    setViewError(null);
    try {
      const url = await getDocumentDownloadUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setViewError("Couldn't open that document. Try again shortly.");
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav />
        <main className="flex-1 p-8 font-mono text-sm">Loading…</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 max-w-3xl mx-auto w-full p-4 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">Resumes</h1>
          <CoverLettersSubnav />
        </div>
        <p className="text-sm text-muted">
          Upload your resume(s) (PDF, DOCX, or TXT). We extract the text and store it so it
          can be attached to every cover letter chat automatically — the resume marked{" "}
          <strong>default</strong> is the one used. The original file stays available here so
          you can always verify or re-download exactly what you uploaded.
        </p>

        <section className="border-3 border-ink p-6 shadow-brutal space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={handleFileSelected}
            className="hidden"
            id="resume-upload"
          />
          <label
            htmlFor="resume-upload"
            className="inline-block border-2 border-ink bg-cta px-4 py-2 font-mono text-xs uppercase cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
          >
            {uploading ? "Uploading…" : "Upload resume"}
          </label>
          {uploadError && <p className="font-mono text-xs text-headline">{uploadError}</p>}
        </section>

        {viewError && <p className="font-mono text-xs text-headline">{viewError}</p>}

        <section className="space-y-3">
          {documents.length === 0 ? (
            <div className="border-3 border-ink border-dashed p-8 text-center">
              <p className="font-mono text-sm">No resumes uploaded yet.</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="border-2 border-ink px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div>
                  <p className="font-mono text-sm">
                    {doc.filename}{" "}
                    {doc.is_default && (
                      <span className="ml-2 border border-ink bg-cta px-2 py-0.5 text-[10px] uppercase align-middle">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-xs text-muted">
                    {formatSize(doc.size_bytes)} · {doc.status}
                    {doc.status === "failed" && doc.error_message ? ` — ${doc.error_message}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleView(doc.id)}
                    className="border-2 border-ink px-3 py-1 font-mono text-xs uppercase hover:bg-cta/20"
                  >
                    View
                  </button>
                  {!doc.is_default && doc.status === "ready" && (
                    <button
                      type="button"
                      onClick={() => makeDefaultDocument(doc.id)}
                      className="border-2 border-ink px-3 py-1 font-mono text-xs uppercase hover:bg-cta/20"
                    >
                      Use as default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeDocument(doc.id)}
                    className="border-2 border-ink px-3 py-1 font-mono text-xs uppercase text-muted hover:bg-headline/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
