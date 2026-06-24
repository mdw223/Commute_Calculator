"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Coordinates, GeocodeSuggestion } from "@/types";

interface StopInputProps {
  label: string;
  value: string;
  onChange: (label: string, coordinates: Coordinates | null) => void;
  placeholder?: string;
}

export default function StopInput({
  label,
  value,
  onChange,
  placeholder = "Start typing an address…",
}: StopInputProps) {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuggestions(data.suggestions ?? []);
        setOpen(true);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(text: string) {
    onChange(text, null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
  }

  function selectSuggestion(s: GeocodeSuggestion) {
    onChange(s.label, s.coordinates);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block font-mono text-xs uppercase tracking-wider text-ink mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full border-3 border-ink bg-surface px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-headline"
        autoComplete="off"
      />
      {loading && (
        <span className="absolute right-3 top-8 text-xs text-muted font-mono">
          …
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 border-3 border-ink bg-surface shadow-brutal max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-cta/30 border-b border-ink/10 last:border-0"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
