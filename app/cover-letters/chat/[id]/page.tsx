"use client";

import { useParams } from "next/navigation";
import ChatView from "@/components/coverletters/ChatView";

export default function CoverLettersChatPage() {
  const params = useParams();
  const id = params.id as string;
  return <ChatView conversationId={id} />;
}
