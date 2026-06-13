import { motion } from "framer-motion";
import { Zap, Copy, Check } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={`flex items-start gap-3 px-4 py-3 group ${isUser ? "flex-row-reverse" : "flex-row"}`}
      data-testid={`message-${message.id}`}
    >
      {/* Avatar */}
      {isUser ? (
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, hsl(220 80% 55%), hsl(262 70% 60%))" }}
        >
          U
        </div>
      ) : (
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(220 80% 62%))",
            boxShadow: "0 0 12px rgba(139,92,246,0.35)",
          }}
        >
          <Zap className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[85%] md:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Role label */}
        <span className="text-xs text-muted-foreground px-1 font-medium">
          {isUser ? "You" : "MAXIMA AI"}
        </span>

        {/* Bubble */}
        <div
          className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser ? "rounded-tr-sm text-white" : "rounded-tl-sm text-foreground"
          }`}
          style={
            isUser
              ? {
                  background: "linear-gradient(135deg, hsl(262 80% 55%), hsl(220 80% 55%))",
                  boxShadow: "0 0 20px rgba(139,92,246,0.25)",
                }
              : {
                  background: "hsl(240 18% 9%)",
                  border: "1px solid rgba(139,92,246,0.15)",
                }
          }
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  // Code blocks
                  code({ className, children, ...props }) {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="inline-code" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <div className="code-block-wrapper">
                        <div className="code-block-header">
                          <span className="code-lang">
                            {className?.replace("language-", "") || "code"}
                          </span>
                          <CopyCodeButton code={String(children)} />
                        </div>
                        <code className={`${className} block`} {...props}>
                          {children}
                        </code>
                      </div>
                    );
                  },
                  // Tables
                  table({ children }) {
                    return (
                      <div className="table-wrapper">
                        <table>{children}</table>
                      </div>
                    );
                  },
                  // Links
                  a({ children, href }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="md-link"
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {/* Streaming cursor */}
              {message.streaming && (
                <span className="streaming-cursor" aria-hidden="true" />
              )}
            </div>
          )}
        </div>

        {/* Action bar (AI messages only) */}
        {!isUser && !message.streaming && (
          <div className="flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              data-testid={`copy-message-${message.id}`}
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground/40 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="code-copy-btn">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
