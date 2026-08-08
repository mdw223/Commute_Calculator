import { Suspense } from "react";
import CoverLettersDashboard from "@/components/coverletters/CoverLettersDashboard";

export const metadata = {
  title: "Cover Letter Studio — Gas In This Economy",
  description: "Generate tailored cover letters from your resume and a job description.",
};

export default function CoverLettersPage() {
  return (
    <Suspense fallback={<div className="p-8 font-mono text-sm">Loading…</div>}>
      <CoverLettersDashboard />
    </Suspense>
  );
}
