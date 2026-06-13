import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Zap, Sparkles, Settings, ChevronDown } from "lucide-react";
import Sidebar from "./components/Sidebar";
import MessageBubble from "./components/MessageBubble";
import MessageInput, { type MessageInputHandle } from "./components/MessageInput";
import TypingIndicator from "./components/TypingIndicator";
import SettingsModal from "./components/SettingsModal";

const queryClient = new QueryClient();
const API_KEY_STORAGE = "maxima_groq_key";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}

// ── Streaming fetch ──────────────────────────────────────────────────────────
async function streamChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  apiKey: string,
  onDelta: (text: string) => void,
  onError: (msg: string) => void,
  signal: AbortSignal
) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-groq-api-key": apiKey } : {}),
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    onError(
      (data as { message?: string }).message ||
        `Request failed (${response.status})`
    );
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) { onError("No response stream."); return; }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const raw = trimmed.slice(5).trim();
      if (raw === "[DONE]") return;
      try {
        const parsed = JSON.parse(raw) as { delta?: string; error?: string };
        if (parsed.error) { onError(parsed.error); return; }
        if (parsed.delta) onDelta(parsed.delta);
      } catch { /* ignore */ }
    }
  }
}

// ── Chat page ────────────────────────────────────────────────────────────────
function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem(API_KEY_STORAGE) ?? ""
  );

  const abortRef = useRef<AbortController | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<MessageInputHandle>(null);
  const isStreamingRef = useRef(false);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const messages = activeChat?.messages ?? [];
  const isStreaming = messages.some((m) => m.streaming);

  // Keep ref in sync so callbacks have current value
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);

  // ── Scroll management ────────────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = messagesScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useLayoutEffect(() => {
    scrollToBottom(isStreaming ? "instant" : "smooth");
  }, [messages.length, isStreaming, scrollToBottom]);

  // Show scroll-to-bottom button when user scrolls up
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 200);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Focus helpers ────────────────────────────────────────────────────────
  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // ── Create new chat ──────────────────────────────────────────────────────
  const createNewChat = useCallback(() => {
    const id = `chat-${Date.now()}`;
    setChats((prev) => [
      { id, title: "New Chat", messages: [], timestamp: new Date() },
      ...prev,
    ]);
    setActiveChatId(id);
    return id;
  }, []);

  // Initial setup
  useEffect(() => {
    createNewChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      // Cmd/Ctrl + Shift + O → New chat
      if (mod && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        createNewChat();
        if (window.innerWidth < 768) setSidebarOpen(false);
        focusInput();
      }
      // Escape → close sidebar on mobile
      if (e.key === "Escape" && window.innerWidth < 768) {
        setSidebarOpen(false);
        focusInput();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createNewChat, focusInput]);

  // ── API key save ─────────────────────────────────────────────────────────
  const handleSaveKey = (key: string) => {
    setApiKey(key);
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
    focusInput();
  };

  // ── Stop streaming ───────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    // Mark any streaming message as done
    setChats((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.streaming ? { ...m, streaming: false } : m
        ),
      }))
    );
    setIsTyping(false);
    focusInput();
  }, [focusInput]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      if (!activeChatId || isStreamingRef.current) return;
      if (!apiKey) { setSettingsOpen(true); return; }

      const userMsg: Message = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      const currentChatId = activeChatId;

      setChats((prev) =>
        prev.map((c) =>
          c.id !== currentChatId
            ? c
            : {
                ...c,
                title:
                  c.messages.length === 0
                    ? text.slice(0, 44) + (text.length > 44 ? "…" : "")
                    : c.title,
                messages: [...c.messages, userMsg],
              }
        )
      );

      // Re-focus input right after submit
      focusInput();

      setIsTyping(true);
      scrollToBottom();

      const aiMsgId = `msg-${Date.now()}-ai`;
      const aiMsg: Message = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      };

      // Brief delay so typing indicator renders
      await new Promise((r) => setTimeout(r, 380));
      setIsTyping(false);

      setChats((prev) =>
        prev.map((c) =>
          c.id === currentChatId
            ? { ...c, messages: [...c.messages, aiMsg] }
            : c
        )
      );

      // Build conversation history
      const history = (
        chats.find((c) => c.id === currentChatId)?.messages ?? []
      )
        .concat(userMsg)
        .filter((m) => m.content.trim())
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      abortRef.current = new AbortController();

      await streamChat(
        history,
        apiKey,
        (delta) => {
          setChats((prev) =>
            prev.map((c) =>
              c.id !== currentChatId
                ? c
                : {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === aiMsgId
                        ? { ...m, content: m.content + delta }
                        : m
                    ),
                  }
            )
          );
        },
        (errMsg) => {
          setChats((prev) =>
            prev.map((c) =>
              c.id !== currentChatId
                ? c
                : {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === aiMsgId
                        ? { ...m, content: `⚠️ ${errMsg}`, streaming: false }
                        : m
                    ),
                  }
            )
          );
          if (errMsg.toLowerCase().includes("api key")) setSettingsOpen(true);
        },
        abortRef.current.signal
      );

      // Finalise streaming
      setChats((prev) =>
        prev.map((c) =>
          c.id !== currentChatId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === aiMsgId ? { ...m, streaming: false } : m
                ),
              }
        )
      );
    },
    [activeChatId, apiKey, chats, focusInput, scrollToBottom]
  );

  // ── Delete chat ──────────────────────────────────────────────────────────
  const handleDeleteChat = (id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      const remaining = chats.filter((c) => c.id !== id);
      if (remaining.length > 0) setActiveChatId(remaining[0].id);
      else createNewChat();
    }
    focusInput();
  };

  return (
    <div
      className="flex h-full relative overflow-hidden"
      style={{ background: "hsl(240 20% 4%)" }}
    >
      <div className="ambient-glow" />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => { setSidebarOpen(false); focusInput(); }}
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={() => {
          createNewChat();
          if (window.innerWidth < 768) setSidebarOpen(false);
          focusInput();
        }}
        onSelectChat={(id) => {
          setActiveChatId(id);
          if (window.innerWidth < 768) setSidebarOpen(false);
          focusInput();
        }}
        onDeleteChat={handleDeleteChat}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{
            borderBottom: "1px solid rgba(139,92,246,0.1)",
            background: "rgba(8,8,18,0.7)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <button
            data-testid="sidebar-toggle"
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/50"
            title="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, hsl(262 80% 65%), hsl(220 80% 62%))",
                boxShadow: "0 0 12px rgba(139,92,246,0.5)",
              }}
            >
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-widest uppercase logo-shimmer">
              MAXIMA AI
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {apiKey ? (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-muted-foreground"
                style={{
                  background: "rgba(139,92,246,0.08)",
                  border: "1px solid rgba(139,92,246,0.18)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Online
              </div>
            ) : (
              <button
                data-testid="configure-key-header"
                onClick={() => setSettingsOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all hover:opacity-80"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                No API key
              </button>
            )}

            <button
              data-testid="open-settings"
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/50"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Messages scroll area */}
        <div
          ref={messagesScrollRef}
          className="flex-1 overflow-y-auto relative"
        >
          {messages.length === 0 ? (
            <WelcomeScreen
              hasApiKey={!!apiKey}
              onSend={handleSend}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          ) : (
            <div className="max-w-3xl mx-auto w-full py-4 px-2">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </AnimatePresence>
              <AnimatePresence>
                {isTyping && <TypingIndicator />}
              </AnimatePresence>
              {/* Invisible scroll anchor */}
              <div className="h-4" />
            </div>
          )}

          {/* Scroll-to-bottom button */}
          <AnimatePresence>
            {showScrollBtn && messages.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                data-testid="scroll-to-bottom"
                onClick={() => scrollToBottom()}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all"
                style={{
                  background: "hsl(240 18% 11%)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  color: "hsl(220 15% 75%)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(139,92,246,0.5)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 4px 20px rgba(139,92,246,0.2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(139,92,246,0.3)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 4px 20px rgba(0,0,0,0.4)";
                }}
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Scroll to bottom
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 max-w-3xl mx-auto w-full">
          <MessageInput
            ref={inputRef}
            onSend={handleSend}
            onStop={handleStop}
            disabled={isTyping}
            isStreaming={isStreaming}
            hasMessages={messages.length > 0}
          />
        </div>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => { setSettingsOpen(false); focusInput(); }}
        apiKey={apiKey}
        onSave={handleSaveKey}
      />
    </div>
  );
}

// ── Welcome screen ───────────────────────────────────────────────────────────
function WelcomeScreen({
  hasApiKey,
  onSend,
  onOpenSettings,
}: {
  hasApiKey: boolean;
  onSend: (msg: string) => void;
  onOpenSettings: () => void;
}) {
  const starters = [
    { label: "What can you do?", icon: "✦" },
    { label: "Who created you?", icon: "◈" },
    { label: "Explain AI in simple terms", icon: "⬡" },
    { label: "Write me a short poem", icon: "✿" },
    { label: "Tell me something fascinating", icon: "◉" },
    { label: "Give me a motivational quote", icon: "▲" },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-12 text-center">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="mb-6"
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
          style={{
            background:
              "linear-gradient(135deg, hsl(262 80% 65%), hsl(220 80% 62%))",
            boxShadow:
              "0 0 40px rgba(139,92,246,0.5), 0 0 80px rgba(139,92,246,0.2)",
          }}
        >
          <Zap className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-widest uppercase mb-2 logo-shimmer">
          MAXIMA AI
        </h1>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
          Next-generation intelligence, ready for any question.
        </p>
      </motion.div>

      {/* No API key banner */}
      <AnimatePresence>
        {!hasApiKey && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ delay: 0.15 }}
            className="mb-6 w-full max-w-sm"
          >
            <div
              className="flex flex-col items-center gap-3 p-4 rounded-2xl text-sm"
              style={{
                background: "rgba(139,92,246,0.07)",
                border: "1px solid rgba(139,92,246,0.22)",
              }}
            >
              <p className="text-muted-foreground text-center text-xs leading-relaxed">
                Add your free Groq API key to activate real AI responses.
              </p>
              <button
                data-testid="add-api-key-welcome"
                onClick={onOpenSettings}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(262 80% 60%), hsl(220 80% 58%))",
                  boxShadow: "0 0 16px rgba(139,92,246,0.3)",
                }}
              >
                <Settings className="w-3.5 h-3.5" />
                Add API Key
              </button>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Get a free key at console.groq.com →
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Starter prompts */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: hasApiKey ? 0.2 : 0.35, duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-w-lg w-full"
      >
        {starters.map((s, i) => (
          <motion.button
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (hasApiKey ? 0.25 : 0.4) + i * 0.055 }}
            data-testid={`starter-${i}`}
            onClick={() => onSend(s.label)}
            className="flex items-start gap-2 px-3 py-3 rounded-xl text-sm text-left transition-all duration-200 text-muted-foreground hover:text-foreground"
            style={{
              background: "hsl(240 18% 8%)",
              border: "1px solid rgba(139,92,246,0.13)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = "rgba(139,92,246,0.38)";
              el.style.boxShadow = "0 0 16px rgba(139,92,246,0.12)";
              el.style.color = "hsl(220 15% 92%)";
              el.style.background = "hsl(240 18% 9.5%)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = "rgba(139,92,246,0.13)";
              el.style.boxShadow = "none";
              el.style.color = "";
              el.style.background = "hsl(240 18% 8%)";
            }}
          >
            <span className="text-primary text-base leading-none flex-shrink-0 mt-0.5">
              {s.icon}
            </span>
            <span className="leading-snug">{s.label}</span>
          </motion.button>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-8 text-xs text-muted-foreground/30 flex items-center gap-1.5"
      >
        <Sparkles className="w-3 h-3" />
        Created by Yash Dixit
      </motion.p>
    </div>
  );
}

// ── App shell ────────────────────────────────────────────────────────────────
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Switch>
          <Route path="/" component={ChatPage} />
        </Switch>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
