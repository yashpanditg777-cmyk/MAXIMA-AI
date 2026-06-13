import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Square } from "lucide-react";

interface MessageInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  hasMessages?: boolean;
}

export interface MessageInputHandle {
  focus: () => void;
}

const suggestions = [
  "What can you do?",
  "Who created you?",
  "Tell me something interesting",
  "Write a short poem",
];

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  ({ onSend, onStop, disabled, isStreaming, hasMessages }, ref) => {
    const [value, setValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    // Auto-focus on mount
    useEffect(() => {
      const t = setTimeout(() => textareaRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }, []);

    // Auto-resize textarea
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height =
          Math.min(textareaRef.current.scrollHeight, 160) + "px";
      }
    }, [value]);

    const handleSubmit = () => {
      const trimmed = value.trim();
      if (!trimmed || disabled) return;
      onSend(trimmed);
      setValue("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    const charCount = value.length;
    const nearLimit = charCount > 3500;

    return (
      <div className="px-4 pb-safe pt-2" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        {/* Suggestion chips — only on empty, fresh chat */}
        <AnimatePresence>
          {!value && !disabled && !hasMessages && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="flex flex-wrap gap-2 mb-3 justify-center"
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  data-testid={`suggestion-${s}`}
                  onClick={() => {
                    onSend(s);
                    textareaRef.current?.focus();
                  }}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all duration-200 text-muted-foreground hover:text-foreground"
                  style={{
                    borderColor: "rgba(139,92,246,0.25)",
                    background: "rgba(139,92,246,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = "rgba(139,92,246,0.5)";
                    el.style.background = "rgba(139,92,246,0.12)";
                    el.style.boxShadow = "0 0 10px rgba(139,92,246,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = "rgba(139,92,246,0.25)";
                    el.style.background = "rgba(139,92,246,0.06)";
                    el.style.boxShadow = "none";
                  }}
                >
                  <Sparkles className="w-2.5 h-2.5 inline mr-1 opacity-60" />
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input box */}
        <div
          className="relative flex items-end gap-2 rounded-2xl px-4 py-3 transition-all duration-300"
          style={{
            background: "hsl(240 18% 8%)",
            border: isFocused
              ? "1px solid rgba(139,92,246,0.55)"
              : "1px solid rgba(139,92,246,0.2)",
            boxShadow: isFocused
              ? "0 0 0 3px rgba(139,92,246,0.08), 0 0 24px rgba(139,92,246,0.12)"
              : "none",
          }}
        >
          <textarea
            ref={textareaRef}
            data-testid="message-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Message MAXIMA AI…"
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent resize-none text-sm text-foreground placeholder:text-muted-foreground/40 outline-none leading-relaxed max-h-40"
            style={{ scrollbarWidth: "none" }}
          />

          {/* Right side: char counter + action button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Char counter when nearing limit */}
            <AnimatePresence>
              {nearLimit && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-xs font-mono"
                  style={{ color: charCount > 4000 ? "#f87171" : "hsl(220 10% 50%)" }}
                >
                  {charCount}/4000
                </motion.span>
              )}
            </AnimatePresence>

            {/* Stop button while streaming, Send button otherwise */}
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.button
                  key="stop"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  data-testid="stop-button"
                  onClick={onStop}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{
                    background: "rgba(248,113,113,0.15)",
                    border: "1px solid rgba(248,113,113,0.3)",
                  }}
                  title="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                </motion.button>
              ) : (
                <motion.button
                  key="send"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  data-testid="send-button"
                  onClick={handleSubmit}
                  disabled={!value.trim() || disabled}
                  whileHover={{ scale: value.trim() ? 1.05 : 1 }}
                  whileTap={{ scale: value.trim() ? 0.95 : 1 }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={
                    value.trim() && !disabled
                      ? {
                          background:
                            "linear-gradient(135deg, hsl(262 80% 65%), hsl(220 80% 62%))",
                          boxShadow: "0 0 16px rgba(139,92,246,0.4)",
                        }
                      : { background: "hsl(240 15% 15%)" }
                  }
                  title="Send (Enter)"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs text-muted-foreground/30">
            ↵ Send · ⇧↵ New line
          </p>
          <p className="text-xs text-muted-foreground/25">
            MAXIMA AI may make mistakes
          </p>
        </div>
      </div>
    );
  }
);

MessageInput.displayName = "MessageInput";

export default MessageInput;
