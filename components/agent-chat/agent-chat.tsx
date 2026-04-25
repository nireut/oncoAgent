"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Send,
  Sparkles,
  Trash2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCollapsible } from "@/lib/use-collapsible";
import type { Patient } from "@/lib/types";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type PatientSession = {
  messages: Message[];
  sessionId: string;
};

function deriveView(pathname: string, patientId: string, specialty?: string | null): string {
  const base = `/patients/${patientId}`;
  const rest = pathname.slice(base.length).replace(/\/$/, "");

  if (!rest) return specialty ? `vault:${specialty}` : "vault";

  const prDetail = rest.match(/^\/prs\/(.+)/);
  if (prDetail) return `pr:${prDetail[1]}`;

  const meetingDetail = rest.match(/^\/meetings\/(.+)/);
  if (meetingDetail) return `meeting:${meetingDetail[1]}`;

  return rest.slice(1);
}

function seedMessages(patient: Patient): Message[] {
  const q = patient.agent.needsYou[0];
  if (q) {
    return [
      {
        id: "m0",
        role: "assistant",
        content: `Hi — I'm watching ${patient.name.split(" ")[0]}'s vault. One decision needs your call: ${q.question}. Ask me anything about the case.`,
      },
    ];
  }
  return [
    {
      id: "m0",
      role: "assistant",
      content: `Hi — I'm watching ${patient.name.split(" ")[0]}'s vault. Ask me anything about the case.`,
    },
  ];
}

function newSessionId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function AgentChat({ patient }: { patient: Patient }) {
  const { collapsed, toggle } = useCollapsible("right");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>(() => seedMessages(patient));
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef(newSessionId());
  const sessionsRef = useRef<Map<string, PatientSession>>(new Map());
  const prevPatientRef = useRef(patient.id);

  useEffect(() => {
    const prev = prevPatientRef.current;
    if (prev === patient.id) return;

    sessionsRef.current.set(prev, {
      messages,
      sessionId: sessionIdRef.current,
    });

    const existing = sessionsRef.current.get(patient.id);
    if (existing) {
      setMessages(existing.messages);
      sessionIdRef.current = existing.sessionId;
    } else {
      setMessages(seedMessages(patient));
      sessionIdRef.current = newSessionId();
    }

    setInput("");
    prevPatientRef.current = patient.id;
  }, [patient.id, patient, messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const clearChat = useCallback(() => {
    if (streaming) return;
    sessionsRef.current.delete(patient.id);
    sessionIdRef.current = newSessionId();
    setMessages(seedMessages(patient));
    setInput("");
  }, [patient, streaming]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };

    setMessages((m) => [...m, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    const history = [...messages.filter((m) => m.id !== "m0"), userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const view = deriveView(pathname, patient.id, searchParams.get("specialty"));

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, patientId: patient.id, view, sessionId: sessionIdRef.current }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text();
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantMsg.id
              ? { ...msg, content: `Error: ${errText || res.statusText}` }
              : msg
          )
        );
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;

          let event: { type: string; content?: string };
          try {
            event = JSON.parse(payload);
          } catch {
            continue;
          }

          if (event.type === "delta" && event.content) {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantMsg.id
                  ? { ...msg, content: msg.content + event.content }
                  : msg
              )
            );
          }

          if (event.type === "error") {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantMsg.id
                  ? { ...msg, content: `Error: ${event.content}` }
                  : msg
              )
            );
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantMsg.id
              ? { ...msg, content: `Connection error: ${(err as Error).message}` }
              : msg
          )
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, messages, pathname, patient.id, searchParams]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const hasHistory = messages.length > 1 || messages[0]?.id !== "m0";

  if (collapsed) {
    return (
      <aside className="hidden w-12 flex-shrink-0 flex-col items-center gap-2 border-l border-border bg-card/40 py-3 xl:flex">
        <button
          type="button"
          onClick={toggle}
          aria-label="Expand agent panel"
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
        <div className="grid h-7 w-7 place-items-center rounded-md bg-violet-100">
          <Sparkles className="h-3.5 w-3.5 text-violet-600" />
        </div>
        <span
          aria-hidden
          className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
        />
      </aside>
    );
  }

  return (
    <aside className="hidden w-[340px] flex-shrink-0 flex-col border-l border-border bg-card/40 xl:flex">
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-violet-100">
            <Sparkles className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <span className="text-[13px] font-semibold tracking-tight">Agent</span>
        </div>
        <div className="flex items-center gap-2">
          {hasHistory && !streaming && (
            <button
              onClick={clearChat}
              className="text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              aria-label="Clear chat"
              title="Clear chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="mono text-[10px] text-muted-foreground">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
            online
          </span>
          <button
            type="button"
            onClick={toggle}
            aria-label="Collapse agent panel"
            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <ol className="flex flex-col gap-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-snug whitespace-pre-wrap",
                  m.role === "user"
                    ? "rounded-br-md bg-violet-500 text-white"
                    : "rounded-bl-md border border-border bg-card text-foreground"
                )}
              >
                {m.content || (streaming && m.role === "assistant" ? <TypingDots /> : null)}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <footer className="border-t border-border bg-card/80 p-3">
        <div className="relative flex items-end gap-2 rounded-xl border border-border bg-background pl-3 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-violet-200">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about this patient..."
            rows={1}
            className="min-h-0 max-h-32 flex-1 resize-none border-0 bg-transparent px-0 py-1.5 text-[13px] shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
          />
          <Button
            type="button"
            onClick={send}
            disabled={!input.trim() || streaming}
            size="icon-sm"
            className="h-7 w-7 flex-shrink-0 rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </footer>
    </aside>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1">
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </span>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="block h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
      style={{
        animation: "agentBlink 1.2s ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}
