import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Trash2, ChevronLeft, Zap } from "lucide-react";

interface Chat {
  id: string;
  title: string;
  timestamp: Date;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: SidebarProps) {
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const groupedChats = () => {
    const today: Chat[] = [];
    const yesterday: Chat[] = [];
    const older: Chat[] = [];
    const now = new Date();
    chats.forEach((chat) => {
      const diff =
        (now.getTime() - chat.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      if (diff < 1) today.push(chat);
      else if (diff < 2) yesterday.push(chat);
      else older.push(chat);
    });
    return { today, yesterday, older };
  };

  const { today, yesterday, older } = groupedChats();

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    setTimeout(() => {
      onDeleteChat(id);
      setDeletingId(null);
    }, 250);
  };

  const ChatItem = ({ chat }: { chat: Chat }) => {
    const isActive = activeChatId === chat.id;
    const isDeleting = deletingId === chat.id;
    const isHovered = hoveredChat === chat.id;

    return (
      <motion.div
        layout
        animate={isDeleting ? { opacity: 0, x: -20, height: 0 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.22 }}
        data-testid={`sidebar-chat-${chat.id}`}
        className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mx-1.5 relative overflow-hidden ${
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        style={{
          background: isActive
            ? "rgba(139,92,246,0.12)"
            : isHovered
            ? "rgba(139,92,246,0.06)"
            : "transparent",
          border: isActive
            ? "1px solid rgba(139,92,246,0.2)"
            : "1px solid transparent",
        }}
        onClick={() => onSelectChat(chat.id)}
        onMouseEnter={() => setHoveredChat(chat.id)}
        onMouseLeave={() => setHoveredChat(null)}
      >
        {/* Active indicator */}
        {isActive && (
          <motion.div
            layoutId="active-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
            style={{ background: "linear-gradient(180deg, #8b5cf6, #60a5fa)" }}
          />
        )}

        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50" />
        <span className="text-sm truncate flex-1">{chat.title}</span>

        {/* Delete button */}
        <AnimatePresence>
          {(isHovered || isActive) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.12 }}
              data-testid={`delete-chat-${chat.id}`}
              onClick={(e) => handleDelete(e, chat.id)}
              className="p-1 rounded-lg transition-all duration-150 flex-shrink-0"
              style={{ color: "hsl(220 10% 50%)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(248,113,113,0.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "hsl(220 10% 50%)";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
              }}
              title="Delete conversation"
            >
              <Trash2 className="w-3 h-3" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const ChatGroup = ({ label, items }: { label: string; items: Chat[] }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-3">
        <p className="text-xs font-semibold text-muted-foreground/40 px-4 mb-1.5 uppercase tracking-widest">
          {label}
        </p>
        {items.map((chat) => (
          <ChatItem key={chat.id} chat={chat} />
        ))}
      </div>
    );
  };

  // Detect OS for shortcut display
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? "⌘" : "Ctrl";

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : "-100%", width: isOpen ? 256 : 256 }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="fixed md:relative top-0 left-0 h-full flex-shrink-0 flex flex-col z-30 md:z-auto"
        style={{
          width: 256,
          background: "hsl(240 22% 5%)",
          borderRight: "1px solid rgba(139,92,246,0.1)",
        }}
      >
        {/* Header / Logo */}
        <div
          className="flex items-center justify-between px-4 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(139,92,246,0.08)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, hsl(262 80% 65%), hsl(220 80% 62%))",
                boxShadow: "0 0 10px rgba(139,92,246,0.4)",
              }}
            >
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-widest uppercase logo-shimmer">
              MAXIMA AI
            </span>
          </div>
          <button
            data-testid="sidebar-close"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat */}
        <div className="px-3 pt-3 pb-1 flex-shrink-0">
          <button
            data-testid="new-chat-button"
            onClick={onNewChat}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
            style={{
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.12))",
              border: "1px solid rgba(139,92,246,0.25)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background =
                "linear-gradient(135deg, rgba(139,92,246,0.22), rgba(59,130,246,0.22))";
              el.style.boxShadow = "0 0 20px rgba(139,92,246,0.18)";
              el.style.borderColor = "rgba(139,92,246,0.45)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background =
                "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.12))";
              el.style.boxShadow = "none";
              el.style.borderColor = "rgba(139,92,246,0.25)";
            }}
          >
            <Plus className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-foreground flex-1 text-left">New Chat</span>
            <kbd
              className="text-xs px-1.5 py-0.5 rounded font-mono hidden sm:inline-block"
              style={{
                background: "rgba(139,92,246,0.1)",
                border: "1px solid rgba(139,92,246,0.2)",
                color: "hsl(220 10% 50%)",
                fontSize: "0.6rem",
              }}
            >
              {modKey}⇧O
            </kbd>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto py-2">
          {chats.length === 0 ? (
            <div className="text-center px-6 py-10">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.1)" }}
              >
                <MessageSquare className="w-5 h-5 text-muted-foreground/30" />
              </div>
              <p className="text-xs text-muted-foreground/40 leading-relaxed">
                Your conversations will appear here
              </p>
            </div>
          ) : (
            <>
              <ChatGroup label="Today" items={today} />
              <ChatGroup label="Yesterday" items={yesterday} />
              <ChatGroup label="Older" items={older} />
            </>
          )}
        </div>

        {/* Footer — User */}
        <div
          className="p-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(139,92,246,0.08)" }}
        >
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-accent/40 cursor-pointer transition-colors">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, hsl(262 80% 65%), hsl(220 80% 62%))",
              }}
            >
              U
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">User</p>
              <p className="text-xs text-muted-foreground/60 truncate">Free Plan</p>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
