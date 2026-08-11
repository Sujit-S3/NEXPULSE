import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AILogo, PremiumSelect } from "@components/common";
import { BlurReveal, GlassTimeline, StreamingPlaceholder, type TimelineItem } from "@components/enterprise";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  AlertCircle,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleStop,
  Clock3,
  DatabaseZap,
  ExternalLink,
  GripVertical,
  MessageSquareText,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { usePlatformConnections } from "../features/core/hooks/usePlatforms";
import {
  aiApi,
  type AICitation,
  type AIConversation,
  type AIStreamEvent,
} from "../features/core/services/api";

type AIModel = AIConversation["model"] | "auto";

interface LiveTool {
  id: string;
  name: string;
  status: "active" | "complete";
  duration?: number;
}

interface LiveTurn {
  conversationId: string;
  prompt: string;
  content: string;
  phase: "thinking" | "streaming" | "complete" | "error";
  status: { id: string; step: string; content: string; duration: number }[];
  tools: LiveTool[];
  citations: AICitation[];
  followUps: string[];
  usage?: { tokens: number; latency: number };
}

const prompts = [
  "What changed most in my performance?",
  "Find the strongest content pattern",
  "Create an executive performance brief",
  "Where should we focus next week?",
];

function apiMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "The AI request could not be completed.";
}

function toolLabel(tool: string): string {
  return tool
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ExecutionTimeline({ turn }: { turn: LiveTurn }) {
  const items: TimelineItem[] = [
    ...turn.status.map((item) => ({
      id: item.id,
      title: item.step,
      detail: item.content,
      meta: item.duration ? `${item.duration} ms` : "Live",
      status: "complete" as const,
      icon: <BrainCircuit aria-hidden="true" />,
    })),
    ...turn.tools.map((tool) => ({
      id: tool.id,
      title: toolLabel(tool.name),
      detail: tool.status === "active" ? "Running against verified workspace data" : "Tool result grounded",
      meta: tool.duration ? `${tool.duration} ms` : "Running",
      status: tool.status,
      icon: <Wrench aria-hidden="true" />,
    })),
    ...(turn.phase === "streaming" || turn.phase === "complete"
      ? [{
          id: "response",
          title: "Compose response",
          detail: turn.phase === "streaming" ? "Streaming the grounded answer" : "Response complete",
          meta: turn.usage ? `${turn.usage.tokens} tokens · ${turn.usage.latency} ms` : "Live",
          status: turn.phase === "complete" ? "complete" as const : "active" as const,
          icon: <Sparkles aria-hidden="true" />,
        }]
      : []),
  ];

  return items.length ? <GlassTimeline items={items} ariaLabel="AI execution timeline" /> : null;
}

function CitationCards({ citations }: { citations?: AICitation[] }) {
  if (!citations?.length) return null;
  return (
    <div className="ai-citation-grid" aria-label="Response citations">
      {citations.map((citation) => (
        <Link key={citation.id} to={citation.path} className="ai-citation-card">
          <span><DatabaseZap aria-hidden="true" /> {citation.kind}</span>
          <strong>{citation.title}</strong>
          <p>{citation.detail}</p>
          <ExternalLink aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}

export function AIPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const connections = usePlatformConnections({ enabled: true });
  const status = useQuery({ queryKey: ["ai", "status"], queryFn: aiApi.status, staleTime: 5 * 60_000 });
  const conversations = useQuery({ queryKey: ["ai", "conversations"], queryFn: aiApi.conversations });
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [model, setModel] = useState<AIModel>("auto");
  const [message, setMessage] = useState("");
  const [historyWidth, setHistoryWidth] = useState(286);
  const [liveTurn, setLiveTurn] = useState<LiveTurn | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const initialPromptApplied = useRef(false);
  const primaryId = connections.data?.find((connection) => connection.isPrimary)?.id ?? null;

  useEffect(() => {
    if (!connectionId && primaryId) setConnectionId(primaryId);
  }, [connectionId, primaryId]);

  useEffect(() => {
    if (!conversationId && conversations.data?.conversations[0]) {
      setConversationId(conversations.data.conversations[0].id);
    }
  }, [conversationId, conversations.data]);

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (!initialPromptApplied.current && prompt) {
      setMessage(prompt.slice(0, 16000));
      initialPromptApplied.current = true;
    }
  }, [searchParams]);

  useEffect(() => {
    if (!liveTurn) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [liveTurn]);

  const activeConversation = useMemo(
    () => conversations.data?.conversations.find((conversation) => conversation.id === conversationId) ?? null,
    [conversationId, conversations.data],
  );

  const remove = useMutation({
    mutationFn: aiApi.deleteConversation,
    onSuccess: () => {
      setConversationId(null);
      setLiveTurn(null);
      void queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
    },
  });

  const handleStreamEvent = useCallback((event: AIStreamEvent) => {
    setLiveTurn((current) => {
      if (!current) return current;
      if (event.type === "chunk") {
        return { ...current, phase: "streaming", content: current.content + event.content };
      }
      if (event.type === "thinking") {
        return {
          ...current,
          status: [
            ...current.status,
            {
              id: `${event.step}-${current.status.length}`,
              step: event.step,
              content: event.content,
              duration: event.duration,
            },
          ],
        };
      }
      if (event.type === "tool_call") {
        return {
          ...current,
          tools: [...current.tools, { id: event.callId, name: event.tool, status: "active" }],
        };
      }
      if (event.type === "tool_result") {
        return {
          ...current,
          tools: current.tools.map((tool) => (
            tool.id === event.callId ? { ...tool, status: "complete", duration: event.duration } : tool
          )),
        };
      }
      if (event.type === "done") {
        return {
          ...current,
          phase: "complete",
          citations: event.citations,
          followUps: event.followUps,
          usage: event.usage,
        };
      }
      setSendError(event.message);
      return { ...current, phase: "error" };
    });
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!connectionId || !status.data?.ready || liveTurn) return;
    setSendError(null);
    let activeId = conversationId;
    try {
      if (!activeId) {
        const created = await aiApi.createConversation(model === "auto" ? undefined : model);
        activeId = created.id;
        setConversationId(created.id);
        await queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setLiveTurn({
        conversationId: activeId,
        prompt: content,
        content: "",
        phase: "thinking",
        status: [],
        tools: [],
        citations: [],
        followUps: [],
      });
      setMessage("");
      await aiApi.streamMessage({
        connectionId,
        conversationId: activeId,
        message: content,
        model: model === "auto" ? undefined : model,
      }, handleStreamEvent, controller.signal);
      await queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
      setLiveTurn(null);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setSendError(apiMessage(error));
      }
      await queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
      setLiveTurn(null);
    } finally {
      abortRef.current = null;
    }
  }, [
    connectionId,
    conversationId,
    handleStreamEvent,
    liveTurn,
    model,
    queryClient,
    status.data?.ready,
  ]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const content = message.trim();
    if (!content) return;
    void sendMessage(content);
  };

  const stop = () => {
    if (!liveTurn) return;
    void aiApi.abortStream(liveTurn.conversationId).finally(() => abortRef.current?.abort());
  };

  const resizeHistory = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin = event.clientX;
    const initial = historyWidth;
    const move = (moveEvent: PointerEvent) => {
      setHistoryWidth(Math.min(360, Math.max(236, initial + moveEvent.clientX - origin)));
    };
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
  };

  const connectionOptions = [
    { value: "", label: "Choose a connected account", description: "Required for factual AI context" },
    ...(connections.data ?? []).map((connection) => ({
      value: connection.id,
      label: connection.displayName,
      description: `${connection.provider}${connection.isPrimary ? " · Primary" : ""}`,
    })),
  ];

  const modelOptions = [
    {
      value: "auto",
      label: "Best available model",
      description: status.data?.defaultModel ? `Default: ${status.data.defaultModel}` : "No provider configured",
      disabled: !status.data?.ready,
    },
    ...(status.data?.models ?? []).map((item) => ({
      value: item.id,
      label: `${item.provider} · ${item.label}`,
      description: item.configured ? "Ready" : "Administrator setup required",
      disabled: !item.configured,
    })),
  ];

  const readyToChat = Boolean(connectionId && status.data?.ready);
  const visibleLiveTurn = liveTurn?.conversationId === conversationId ? liveTurn : null;
  const hasMessages = Boolean(activeConversation?.messages.length || visibleLiveTurn);

  return (
    <div
      className="ai-command-center -m-[var(--spacing-4)] min-h-[calc(100dvh-3.5rem)] overflow-hidden md:-m-[var(--spacing-6)] lg:-m-[var(--spacing-8)]"
      style={{ "--ai-history-width": `${historyWidth}px` } as React.CSSProperties}
      aria-label="AI command center"
    >
      <aside className="ai-command-history">
        <div className="mb-5 flex items-center gap-3 px-1">
          <span className="premium-logo-shell grid size-10 place-items-center rounded-2xl bg-[var(--color-bg-surface)]">
            <AILogo size={28} animate />
          </span>
          <span>
            <strong className="block text-sm">NEXPULSE AI</strong>
            <small>Command center</small>
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setConversationId(null);
            setLiveTurn(null);
          }}
          disabled={!status.data?.ready || Boolean(liveTurn)}
          className="premium-primary-button !min-h-11 !w-full !px-4 disabled:pointer-events-none disabled:opacity-45"
        >
          <Plus aria-hidden="true" /> New command
        </button>

        <div className="mt-5 min-h-0 flex-1 space-y-1 overflow-y-auto">
          <p className="ai-section-label">Command history</p>
          {conversations.data?.conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => {
                setConversationId(conversation.id);
                setLiveTurn(null);
              }}
              className={conversation.id === conversationId ? "ai-history-item is-active" : "ai-history-item"}
            >
              <span>
                <MessageSquareText aria-hidden="true" />
                <strong>{conversation.title}</strong>
              </span>
              <small>{conversation.model} · {new Date(conversation.updatedAt).toLocaleDateString()}</small>
            </button>
          ))}
          {!conversations.isLoading && !conversations.data?.conversations.length && (
            <p className="px-3 py-6 text-center text-xs text-[var(--color-fg-subtle)]">No commands yet</p>
          )}
        </div>

        {conversationId && (
          <button
            type="button"
            onClick={() => remove.mutate(conversationId)}
            disabled={remove.isPending || Boolean(liveTurn)}
            className="ai-delete-command"
          >
            <Trash2 aria-hidden="true" /> Delete command
          </button>
        )}
      </aside>

      <button
        type="button"
        className="ai-resize-handle"
        onPointerDown={resizeHistory}
        aria-label="Resize command history"
      >
        <GripVertical aria-hidden="true" />
      </button>

      <section className="ai-command-workspace">
        <header className="ai-command-header">
          <div>
            <p>Enterprise intelligence workspace</p>
            <strong>{activeConversation?.title ?? "New intelligence command"}</strong>
          </div>
          <PremiumSelect
            value={connectionId ?? ""}
            options={connectionOptions}
            onChange={(next) => setConnectionId(next || null)}
            ariaLabel="AI analytics account"
          />
          <PremiumSelect
            value={model}
            options={modelOptions}
            onChange={(next) => setModel(next as AIModel)}
            ariaLabel="AI model"
            disabled={status.isLoading}
          />
        </header>

        {!status.isLoading && !status.data?.ready && (
          <div className="ai-provider-alert">
            <AlertCircle aria-hidden="true" />
            <div>
              <p>AI provider setup required</p>
              <span>Add at least one supported provider key to enable grounded analysis.</span>
            </div>
          </div>
        )}

        <div ref={scrollRef} className="ai-command-scroll">
          {!connectionId ? (
            <div className="ai-empty-state">
              <span className="premium-logo-shell"><BrainCircuit aria-hidden="true" /></span>
              <p>Grounded intelligence</p>
              <h1>Choose an account to begin.</h1>
              <span>NEXPULSE builds each response from synchronized metrics and your workspace permissions.</span>
            </div>
          ) : !hasMessages ? (
            <div className="ai-starter">
              <div className="ai-empty-state">
                <span className="premium-logo-shell"><AILogo size={48} animate /></span>
                <p>AI analytics assistant</p>
                <h1>Ask a sharper question.</h1>
                <span>Explore performance, surface content patterns, and turn provider data into a decision.</span>
              </div>
              <div className="ai-prompt-grid">
                {prompts.map((prompt) => (
                  <button key={prompt} type="button" disabled={!readyToChat} onClick={() => setMessage(prompt)}>
                    <Sparkles aria-hidden="true" />
                    {prompt}
                    <ChevronRight aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="ai-message-stack">
              {activeConversation?.messages.map((item) => (
                <BlurReveal key={item.id} className={item.role === "user" ? "ai-message is-user" : "ai-message is-assistant"}>
                  <header>
                    <span>{item.role === "user" ? "You" : "NEXPULSE AI"}</span>
                    <time>{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                  </header>
                  <p>{item.content}</p>
                  {item.role === "assistant" && item.toolCalls?.length ? (
                    <div className="ai-tool-summary">
                      <Check aria-hidden="true" /> {item.toolCalls.length} verified tool {item.toolCalls.length === 1 ? "run" : "runs"}
                    </div>
                  ) : null}
                  <CitationCards citations={item.citations} />
                  {item.role === "assistant" && item.followUps?.length ? (
                    <div className="ai-message-actions">
                      {item.followUps.map((followUp) => (
                        <button key={followUp} type="button" onClick={() => setMessage(followUp)}>
                          {followUp}<ChevronRight aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </BlurReveal>
              ))}

              {visibleLiveTurn && (
                <>
                  <BlurReveal className="ai-message is-user">
                    <header><span>You</span><time>Now</time></header>
                    <p>{visibleLiveTurn.prompt}</p>
                  </BlurReveal>
                  <BlurReveal className="ai-message is-assistant is-live" aria-live="polite">
                    <header><span>NEXPULSE AI</span><time>Live</time></header>
                    {visibleLiveTurn.content
                      ? <p>{visibleLiveTurn.content}<span className="ai-stream-caret" aria-hidden="true" /></p>
                      : <StreamingPlaceholder label="Grounding your command" />}
                    <ExecutionTimeline turn={visibleLiveTurn} />
                    <CitationCards citations={visibleLiveTurn.citations} />
                  </BlurReveal>
                </>
              )}

              {visibleLiveTurn?.followUps.length ? (
                <div className="ai-follow-ups">
                  <span>Suggested next actions</span>
                  {visibleLiveTurn.followUps.map((followUp) => (
                    <button key={followUp} type="button" onClick={() => setMessage(followUp)}>
                      {followUp}<ChevronRight aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {(sendError || conversations.error || status.error) && (
            <div role="alert" className="ai-error-message">
              <AlertCircle aria-hidden="true" />
              {sendError ?? apiMessage(conversations.error ?? status.error)}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="ai-command-composer">
          <div>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2}
              maxLength={16000}
              disabled={!readyToChat || Boolean(liveTurn)}
              placeholder={status.data?.ready ? "Ask anything about this account…" : "Configure an AI provider to begin…"}
            />
            {liveTurn ? (
              <button type="button" onClick={stop} className="is-stop" aria-label="Stop response">
                <CircleStop aria-hidden="true" />
              </button>
            ) : (
              <button type="submit" disabled={!message.trim() || !readyToChat} aria-label="Send message">
                <Send aria-hidden="true" />
              </button>
            )}
          </div>
          <p><Clock3 aria-hidden="true" /> Responses use synchronized workspace data and never invent unavailable metrics.</p>
        </form>
      </section>
    </div>
  );
}
