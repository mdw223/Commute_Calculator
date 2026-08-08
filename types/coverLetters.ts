export interface CoverLetterUser {
  id: string;
  email: string;
  name: string | null;
  picture_url: string | null;
  full_name: string | null;
  phone: string | null;
  location: string | null;
  profile_notes: string | null;
  plan: string;
}

export type DocumentStatus = "processing" | "ready" | "failed";

export interface ResumeDocument {
  id: string;
  kind: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: DocumentStatus;
  error_message: string | null;
  is_default: boolean;
  created_at: string;
}

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  cover_letter_id: string | null;
  created_at: string;
}

export type ConversationStatus = "active" | "completed";

export interface Conversation {
  id: string;
  title: string;
  job_description: string | null;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: ChatMessage[];
}

export interface CoverLetterFile {
  id: string;
  conversation_id: string | null;
  company_name: string | null;
  job_title: string | null;
  template_key: string;
  filename: string;
  created_at: string;
}

export interface ConversationCreateResponse {
  conversation: Conversation;
  messages: ChatMessage[];
  cover_letter: CoverLetterFile | null;
}

export interface SendMessageResponse {
  messages: ChatMessage[];
  cover_letter: CoverLetterFile | null;
}
