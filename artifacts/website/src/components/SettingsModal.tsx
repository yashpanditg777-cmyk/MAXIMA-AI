import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Key, Eye, EyeOff, CheckCircle, ExternalLink, AlertCircle, Trash2 } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSave: (key: string) => void;
}

export default function SettingsModal({ isOpen, onClose, apiKey, onSave }: SettingsModalProps) {
  const [value, setValue] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(apiKey);
  }, [apiKey, isOpen]);

  const handleSave = () => {
    const trimmed = value.trim();
    onSave(trimmed);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    setValue("");
    onSave("");
  };

  const maskedKey = value
    ? value.slice(0, 6) + "••••••••••••••••" + value.slice(-4)
    : "";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4"
          >
            <div
              className="rounded-2xl p-6 shadow-2xl"
              style={{
                background: "hsl(240 18% 7%)",
                border: "1px solid rgba(139,92,246,0.3)",
                boxShadow: "0 0 60px rgba(139,92,246,0.15), 0 24px 48px rgba(0,0,0,0.5)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(220 80% 62%))" }}
                  >
                    <Key className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="font-bold text-foreground text-lg">API Settings</h2>
                </div>
                <button
                  data-testid="settings-close"
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Info banner */}
              <div
                className="flex gap-3 p-3.5 rounded-xl mb-5 text-sm"
                style={{
                  background: "rgba(139,92,246,0.08)",
                  border: "1px solid rgba(139,92,246,0.2)",
                }}
              >
                <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-muted-foreground leading-relaxed">
                  Your key is stored only in your browser (localStorage). It's never saved on any server.{" "}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                    data-testid="groq-console-link"
                  >
                    Get a free key at console.groq.com
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Groq API Key
                </label>
                <div
                  className="flex items-center gap-2 rounded-xl px-4 py-3 transition-all duration-200"
                  style={{
                    background: "hsl(240 15% 10%)",
                    border: "1px solid rgba(139,92,246,0.25)",
                  }}
                  onFocus={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,92,246,0.5)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)";
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,92,246,0.25)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  <input
                    data-testid="api-key-input"
                    type={showKey ? "text" : "password"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="gsk_••••••••••••••••••••••••••••••••"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    data-testid="toggle-key-visibility"
                    onClick={() => setShowKey((v) => !v)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Preview of saved key */}
                {apiKey && !value.includes("•") && (
                  <p className="text-xs text-muted-foreground/50 mt-1.5 font-mono px-1">
                    Current: {maskedKey}
                  </p>
                )}
              </div>

              {/* Model info */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-5 text-xs text-muted-foreground"
                style={{ background: "hsl(240 15% 9%)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                <span>Using model: <span className="text-foreground font-medium">llama-3.3-70b-versatile</span> (free tier)</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {apiKey && (
                  <button
                    data-testid="clear-api-key"
                    onClick={handleClear}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 border border-transparent hover:border-destructive/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
                <button
                  data-testid="cancel-settings"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm border transition-colors text-muted-foreground hover:text-foreground"
                  style={{ borderColor: "rgba(255,255,255,0.1)", background: "transparent" }}
                >
                  Cancel
                </button>
                <button
                  data-testid="save-api-key"
                  onClick={handleSave}
                  disabled={!value.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, hsl(262 80% 60%), hsl(220 80% 58%))",
                    boxShadow: value.trim() ? "0 0 20px rgba(139,92,246,0.3)" : "none",
                  }}
                >
                  {saved ? (
                    <><CheckCircle className="w-4 h-4" /> Saved!</>
                  ) : (
                    "Save Key"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
