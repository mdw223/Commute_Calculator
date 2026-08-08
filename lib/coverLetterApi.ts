import type {
  Conversation,
  ConversationCreateResponse,
  ConversationDetail,
  CoverLetterFile,
  CoverLetterUser,
  ResumeDocument,
  SendMessageResponse,
} from "@/types/coverLetters";

const API_URL = process.env.NEXT_PUBLIC_COVER_LETTER_API_URL || "http://localhost:8001";

// Deliberately a different localStorage key from Sweeps — Cover Letter
// Studio accounts are separate, so the two tools never share a session.
const TOKEN_KEY = "cover_letter_auth_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearAuthToken();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getGoogleLoginUrl(): string {
  return `${API_URL}/auth/google/login`;
}

export async function getMe(): Promise<CoverLetterUser> {
  return apiFetch<CoverLetterUser>("/users/me");
}

export async function updateProfile(
  data: Partial<Pick<CoverLetterUser, "full_name" | "phone" | "location" | "profile_notes">>
): Promise<CoverLetterUser> {
  return apiFetch<CoverLetterUser>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function listDocuments(): Promise<ResumeDocument[]> {
  return apiFetch<ResumeDocument[]>("/documents");
}

export async function uploadDocument(file: File): Promise<ResumeDocument> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<ResumeDocument>("/documents", { method: "POST", body: formData });
}

export async function setDefaultDocument(id: string, isDefault: boolean): Promise<ResumeDocument> {
  return apiFetch<ResumeDocument>(`/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ is_default: isDefault }),
  });
}

export async function deleteDocument(id: string): Promise<void> {
  return apiFetch<void>(`/documents/${id}`, { method: "DELETE" });
}

export async function getDocumentDownloadUrl(id: string): Promise<string> {
  const { url } = await apiFetch<{ url: string }>(`/documents/${id}/download`);
  return url;
}

export async function listConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>("/conversations");
}

export async function createConversation(
  jobDescription: string
): Promise<ConversationCreateResponse> {
  return apiFetch<ConversationCreateResponse>("/conversations", {
    method: "POST",
    body: JSON.stringify({ job_description: jobDescription }),
  });
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  return apiFetch<ConversationDetail>(`/conversations/${id}`);
}

export async function deleteConversation(id: string): Promise<void> {
  return apiFetch<void>(`/conversations/${id}`, { method: "DELETE" });
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<SendMessageResponse> {
  return apiFetch<SendMessageResponse>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function listCoverLetters(): Promise<CoverLetterFile[]> {
  return apiFetch<CoverLetterFile[]>("/cover-letters");
}

export async function getCoverLetterDownloadUrl(id: string): Promise<string> {
  const { url } = await apiFetch<{ url: string }>(`/cover-letters/${id}/download`);
  return url;
}
