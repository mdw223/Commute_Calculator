"use client";

import { useState } from "react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import CoverLettersSubnav from "@/components/coverletters/CoverLettersSubnav";
import { useCoverLetters } from "@/components/coverletters/CoverLettersProvider";
import { updateProfile } from "@/lib/coverLetterApi";
import type { CoverLetterUser } from "@/types/coverLetters";

export default function SettingsForm() {
  const { user, loading } = useCoverLetters();

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav />
        <main className="flex-1 p-8 font-mono text-sm">Loading…</main>
      </div>
    );
  }

  // Keyed by user id so state is (re)initialized from `user` exactly once
  // per sign-in, without needing an effect + setState to sync it.
  return <SettingsFormFields key={user.id} user={user} />;
}

function SettingsFormFields({ user }: { user: CoverLetterUser }) {
  const { setUser } = useCoverLetters();
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [location, setLocation] = useState(user.location ?? "");
  const [profileNotes, setProfileNotes] = useState(user.profile_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({
        full_name: fullName,
        phone,
        location,
        profile_notes: profileNotes,
      });
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">Settings</h1>
          <CoverLettersSubnav />
        </div>

        <section className="border-3 border-ink p-6 shadow-brutal space-y-4">
          <h2 className="font-mono text-xs uppercase">Cover letter header details</h2>
          <p className="text-xs text-muted -mt-2">
            These are used exactly as entered on every generated letter — the AI never
            invents contact details.
          </p>
          <label className="block text-sm">
            Full name
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono"
            />
          </label>
          <label className="block text-sm">
            Phone
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono"
            />
          </label>
          <label className="block text-sm">
            Location
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Austin, TX"
              className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono"
            />
          </label>
        </section>

        <section className="border-3 border-ink p-6 shadow-brutal space-y-4">
          <h2 className="font-mono text-xs uppercase">About you (optional)</h2>
          <p className="text-xs text-muted -mt-2">
            Anything you want the AI to always know when writing your cover letters — career
            goals, tone preferences, things your resume doesn&apos;t capture well.
          </p>
          <textarea
            value={profileNotes}
            onChange={(e) => setProfileNotes(e.target.value)}
            rows={6}
            className="w-full border-2 border-ink px-3 py-2 font-mono text-sm"
          />
        </section>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="border-2 border-ink bg-cta px-4 py-2 font-mono text-xs uppercase disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <p className="font-mono text-xs text-muted">Saved!</p>}
      </main>
      <SiteFooter />
    </div>
  );
}
