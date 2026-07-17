import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DitherArt from "@/components/DitherArt";
import { footballPainter } from "@/lib/painters";

const EASE = [0.76, 0, 0.24, 1] as const;
const WORDS = ["REPLAY", "ANALYSE", "RECOMMEND", "CONFIRM", "SETTLE"];

/**
 * Alche-style intro sequence: counter climbs 0→100 while cycling
 * process words, the dithered ball breathes in the middle, then the
 * whole screen wipes upward to reveal the app.
 */
export default function Loader({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let v = 0;
    const id = setInterval(() => {
      // ease-out counting like a preloader fetching chunks
      v += Math.max(1, Math.round((100 - v) / 14));
      if (v >= 100) {
        v = 100;
        clearInterval(id);
        setTimeout(() => setLeaving(true), 450);
        setTimeout(onDone, 1400);
      }
      setCount(v);
    }, 70);
    return () => clearInterval(id);
  }, [onDone]);

  const word = WORDS[Math.min(WORDS.length - 1, Math.floor((count / 100) * WORDS.length))]!;

  return (
    <AnimatePresence>
      {!leaving ? (
        <motion.div
          key="loader"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.9, ease: EASE }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-paper"
        >
          {/* corner marks — print registration style */}
          {[
            "top-6 left-6 border-t-2 border-l-2",
            "top-6 right-6 border-t-2 border-r-2",
            "bottom-6 left-6 border-b-2 border-l-2",
            "bottom-6 right-6 border-b-2 border-r-2",
          ].map((pos) => (
            <motion.span
              key={pos}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
              className={`absolute h-10 w-10 border-blue ${pos}`}
            />
          ))}

          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: [0.9, 1, 0.96, 1], opacity: 1 }}
            transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
            className="h-[220px] w-[220px] sm:h-[280px] sm:w-[280px]"
          >
            <DitherArt painter={footballPainter} pixelSize={3} timeScale={1.4} />
          </motion.div>

          <div className="mt-8 flex w-[260px] items-end justify-between sm:w-[320px]">
            <div className="overflow-hidden">
              <motion.p
                key={word}
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="font-mono text-[11px] tracking-[0.35em] text-blue uppercase"
              >
                {word}
              </motion.p>
            </div>
            <p className="font-serif text-5xl leading-none text-blue-ink tabular-nums">
              {String(count).padStart(3, "0")}
              <span className="font-mono text-sm text-blue-mid">%</span>
            </p>
          </div>

          {/* progress hairline */}
          <div className="mt-4 h-px w-[260px] bg-blue-wash sm:w-[320px]">
            <motion.div
              className="h-full bg-blue"
              animate={{ width: `${count}%` }}
              transition={{ ease: "linear", duration: 0.1 }}
            />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-8 font-mono text-[10px] tracking-[0.3em] text-blue-mid uppercase"
          >
            World Cup Betting Agent — simulation only
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
