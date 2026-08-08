"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearAuthToken,
  deleteDocument,
  getAuthToken,
  getMe,
  listDocuments,
  setDefaultDocument,
  uploadDocument,
} from "@/lib/coverLetterApi";
import type { CoverLetterUser, ResumeDocument } from "@/types/coverLetters";

interface CoverLettersContextValue {
  user: CoverLetterUser | null;
  documents: ResumeDocument[];
  loading: boolean;
  error: string | null;
  refreshDocuments: () => Promise<void>;
  uploadResume: (file: File) => Promise<ResumeDocument>;
  removeDocument: (id: string) => Promise<void>;
  makeDefaultDocument: (id: string) => Promise<void>;
  signOut: () => void;
  setUser: (user: CoverLetterUser) => void;
}

const CoverLettersContext = createContext<CoverLettersContextValue | null>(null);

export function useCoverLetters(): CoverLettersContextValue {
  const ctx = useContext(CoverLettersContext);
  if (!ctx) {
    throw new Error("useCoverLetters must be used within CoverLettersProvider");
  }
  return ctx;
}

export function CoverLettersProvider({ children }: { children: ReactNode }) {
  const initializedRef = useRef(false);
  const [user, setUser] = useState<CoverLetterUser | null>(null);
  const [documents, setDocuments] = useState<ResumeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDocuments = useCallback(async () => {
    const docs = await listDocuments();
    setDocuments(docs);
  }, []);

  const uploadResume = useCallback(async (file: File) => {
    const doc = await uploadDocument(file);
    setDocuments((prev) => {
      const next = doc.is_default ? prev.map((d) => ({ ...d, is_default: false })) : prev;
      return [doc, ...next];
    });
    return doc;
  }, []);

  const removeDocument = useCallback(async (id: string) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const makeDefaultDocument = useCallback(async (id: string) => {
    const updated = await setDefaultDocument(id, true);
    setDocuments((prev) => prev.map((d) => (d.id === id ? updated : { ...d, is_default: false })));
  }, []);

  const signOut = useCallback(() => {
    clearAuthToken();
    initializedRef.current = false;
    setUser(null);
    setDocuments([]);
    setError("Not signed in");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!getAuthToken()) {
        setUser(null);
        setError("Not signed in");
        setLoading(false);
        return;
      }
      if (initializedRef.current) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const me = await getMe();
        if (cancelled) return;
        setUser(me);
        await refreshDocuments();
        if (cancelled) return;
        setError(null);
        initializedRef.current = true;
      } catch {
        if (cancelled) return;
        setUser(null);
        setError("Not signed in");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshDocuments]);

  return (
    <CoverLettersContext.Provider
      value={{
        user,
        documents,
        loading,
        error,
        refreshDocuments,
        uploadResume,
        removeDocument,
        makeDefaultDocument,
        signOut,
        setUser,
      }}
    >
      {children}
    </CoverLettersContext.Provider>
  );
}
