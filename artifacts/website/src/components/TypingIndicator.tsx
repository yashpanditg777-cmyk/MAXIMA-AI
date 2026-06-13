import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 px-4 py-3"
      data-testid="typing-indicator"
    >
      {/* AI Avatar */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(220 80% 62%))",
          boxShadow: "0 0 12px rgba(139,92,246,0.4)",
        }}
      >
        <Zap className="w-4 h-4 text-white" />
      </div>

      {/* Thinking bubble */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl rounded-tl-sm"
        style={{
          background: "hsl(240 18% 9%)",
          border: "1px solid rgba(139,92,246,0.2)",
        }}
      >
        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block w-1.5 h-1.5 rounded-full"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #60a5fa)" }}
              animate={{
                y: [0, -5, 0],
                opacity: [0.4, 1, 0.4],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.0,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.15,
              }}
            />
          ))}
        </div>

        {/* Text */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-muted-foreground/60 font-medium tracking-wide"
        >
          MAXIMA AI is thinking…
        </motion.span>
      </div>
    </motion.div>
  );
}
