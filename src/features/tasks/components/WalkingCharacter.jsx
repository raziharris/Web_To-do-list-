import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const characterStyles = {
  lion: {
    body: "rounded-[44%_56%_48%_52%/58%_55%_45%_42%] bg-amber-200 dark:bg-amber-300/80",
    accent: "bg-orange-300 dark:bg-orange-300/80",
    paw: "bg-amber-700/80 dark:bg-amber-100/90",
    personality: { stepBoost: 0.92, bounce: 5, roll: 1 },
  },
  cat: {
    body: "rounded-[52%_48%_46%_54%/56%_55%_45%_44%] bg-orange-50 dark:bg-orange-100/90",
    accent: "bg-rose-200 dark:bg-rose-200/90",
    paw: "bg-slate-700/80 dark:bg-white/90",
    personality: { stepBoost: 1.08, bounce: 3.5, roll: 1.4 },
  },
  hamster: {
    body: "rounded-[58%_42%_54%_46%/52%_58%_42%_48%] bg-amber-100 dark:bg-amber-100/90",
    accent: "bg-pink-200 dark:bg-pink-200/90",
    paw: "bg-amber-800/75 dark:bg-amber-100/90",
    personality: { stepBoost: 1.72, bounce: 7.5, roll: 3.2 },
  },
};

const outlineStyles = {
  soft: "border-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.14)] dark:border-white/20",
  bold: "border-slate-700 shadow-[0_12px_0_rgba(15,23,42,0.12),0_20px_38px_rgba(15,23,42,0.14)] dark:border-white",
  sticker: "border-white shadow-[0_10px_0_rgba(15,23,42,0.1),0_22px_42px_rgba(15,23,42,0.16)]",
};

function WalkingCharacter({ settings, reactionId, lane = 0 }) {
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === "undefined" ? 1024 : window.innerWidth));

  useEffect(() => {
    function updateViewportWidth() {
      setViewportWidth(window.innerWidth);
    }

    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  const responsiveScale = viewportWidth < 640 ? 0.78 : 1;
  const characterSize = Math.min(settings.size * responsiveScale, Math.max(viewportWidth - 36, 56));
  const edgePadding = viewportWidth < 640 ? 10 : 18;
  const leftEdge = edgePadding + lane * 12;
  const rightEdge = Math.max(leftEdge, viewportWidth - characterSize - edgePadding);
  const speedProgress = Math.min(Math.max(((settings.speed ?? 14) - 1) / 29, 0), 1);
  const walkDuration = 26 - speedProgress * 14;
  const character = characterStyles[settings.characterType] || characterStyles.lion;
  const stepDuration = (0.9 - speedProgress * 0.36) / character.personality.stepBoost;
  const pauseDuration = (settings.pauseDuration ?? 0.8) * 0.55;
  const totalDuration = walkDuration + pauseDuration * 2;
  const pauseStep = pauseDuration / totalDuration;
  const halfStep = 0.5;
  const timeline = useMemo(
    () => ({
      x: [leftEdge, leftEdge, rightEdge, rightEdge, leftEdge],
      scaleX: [1, 1, 1, -1, -1, -1, 1],
      times: [0, pauseStep, halfStep - pauseStep, halfStep, halfStep + pauseStep, 1 - pauseStep, 1],
    }),
    [leftEdge, pauseStep, rightEdge],
  );
  const outlineClass = outlineStyles[settings.outline] || outlineStyles.soft;
  const faceZoom = `${settings.faceZoom ?? 108}%`;
  const faceShapeClass = settings.faceShape === "square" ? "rounded-[1.15rem]" : "rounded-full";
  const walkingAreaHeight = Math.max(settings.walkingAreaHeight ?? 120, characterSize + 18 + lane * 12);
  const idleAnimation = settings.idleAnimations !== false ? { y: [0, -3, 0] } : { y: 0 };
  const imageFilter = `brightness(${settings.faceBrightness ?? 100}%)`;

  if (!settings.enabled) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-2 z-[70] overflow-visible sm:bottom-4"
      style={{ height: walkingAreaHeight, bottom: 8 + lane * 18 }}
    >
      <motion.div
        key={`walk-${settings.speed}-${settings.pauseDuration}-${characterSize}-${viewportWidth}`}
        className="absolute bottom-1 will-change-transform"
        initial={{ x: leftEdge }}
        animate={settings.walking ? { x: timeline.x } : { x: leftEdge }}
        transition={
          settings.walking
            ? { duration: totalDuration, times: [0, pauseStep, halfStep - pauseStep, halfStep, 1], ease: "easeInOut", repeat: Infinity }
            : { duration: 0.45, ease: "easeOut" }
        }
      >
        <motion.div
          className="relative"
          animate={settings.walking ? { scaleX: timeline.scaleX } : idleAnimation}
          transition={
            settings.walking
              ? { duration: totalDuration, times: timeline.times, ease: "easeInOut", repeat: Infinity }
              : { duration: 2, ease: "easeInOut", repeat: Infinity }
          }
          style={{ width: characterSize, height: characterSize * 1.05 }}
        >
          <motion.div
            className={`absolute inset-x-[12%] bottom-[12%] h-[82%] overflow-hidden border-4 bg-white ${character.body} ${outlineClass} ${faceShapeClass}`}
            animate={
              settings.walking
                ? { y: [0, -character.personality.bounce, 0], rotate: [-character.personality.roll, character.personality.roll, -character.personality.roll] }
                : { y: [0, -2, 0] }
            }
            transition={{ duration: settings.walking ? stepDuration : 1.8, ease: "easeInOut", repeat: Infinity }}
          >
            <img
              src={settings.faceImage}
              alt=""
              className="h-full w-full object-cover"
              draggable="false"
              style={{
                width: faceZoom,
                height: faceZoom,
                maxWidth: "none",
                objectPosition: `${settings.faceX}% ${settings.faceY}%`,
                transform: `rotate(${settings.faceRotation ?? 0}deg)`,
                filter: imageFilter,
              }}
            />
            <div className="absolute inset-0 ring-2 ring-inset ring-white/55 dark:ring-white/15" />
            {settings.characterType === "lion" && (
              <>
                <div className="absolute inset-[-11%] rounded-[48%_52%_50%_50%/55%_45%_55%_45%] border-[12px] border-orange-300/80 dark:border-orange-300/55" />
                <div className="absolute inset-[6%] rounded-full border-4 border-amber-100/65" />
              </>
            )}
            {settings.characterType === "hamster" && (
              <>
                <div className="absolute left-[8%] top-[48%] h-[18%] w-[22%] rounded-full bg-pink-200/85 blur-[1px]" />
                <div className="absolute right-[8%] top-[48%] h-[18%] w-[22%] rounded-full bg-pink-200/85 blur-[1px]" />
                <div className="absolute left-[28%] top-[64%] h-[8%] w-[10%] rounded-full bg-amber-300/70" />
                <div className="absolute right-[28%] top-[64%] h-[8%] w-[10%] rounded-full bg-amber-300/70" />
              </>
            )}
            <div className={`absolute -left-[18%] top-[48%] h-[17%] w-[24%] rounded-full ${character.accent} shadow-card`} />
            <div className={`absolute -right-[18%] top-[48%] h-[17%] w-[24%] rounded-full ${character.accent} shadow-card`} />
          </motion.div>

          {settings.characterType === "cat" && (
            <>
              <motion.span
                className={`absolute left-[20%] top-[2%] h-[22%] w-[18%] rotate-[-18deg] rounded-[75%_25%_70%_30%] border-2 border-white/80 ${character.body} shadow-card`}
                animate={settings.walking || settings.idleAnimations !== false ? { rotate: [-24, -12, -24] } : { rotate: -18 }}
                transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
              />
              <motion.span
                className={`absolute right-[20%] top-[2%] h-[22%] w-[18%] rotate-[18deg] rounded-[25%_75%_30%_70%] border-2 border-white/80 ${character.body} shadow-card`}
                animate={settings.walking || settings.idleAnimations !== false ? { rotate: [24, 12, 24] } : { rotate: 18 }}
                transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
              />
              <span className="absolute left-[25%] top-[8%] h-[9%] w-[8%] rotate-[-18deg] rounded-full bg-rose-200/80" />
              <span className="absolute right-[25%] top-[8%] h-[9%] w-[8%] rotate-[18deg] rounded-full bg-rose-200/80" />
            </>
          )}

          {settings.characterType === "lion" && (
            <>
              <span className="absolute left-[17%] top-[7%] h-[16%] w-[16%] rounded-full bg-orange-300/85 shadow-card" />
              <span className="absolute right-[17%] top-[7%] h-[16%] w-[16%] rounded-full bg-orange-300/85 shadow-card" />
              <span className="absolute left-[34%] top-[-1%] h-[11%] w-[13%] rounded-full bg-orange-300/75 shadow-card" />
              <span className="absolute right-[34%] top-[-1%] h-[11%] w-[13%] rounded-full bg-orange-300/75 shadow-card" />
            </>
          )}

          {settings.characterType === "hamster" && (
            <>
              <span className="absolute left-[16%] top-[12%] h-[15%] w-[15%] rounded-full bg-amber-200 shadow-card" />
              <span className="absolute right-[16%] top-[12%] h-[15%] w-[15%] rounded-full bg-amber-200 shadow-card" />
              <span className="absolute left-[20%] top-[17%] h-[7%] w-[7%] rounded-full bg-pink-200" />
              <span className="absolute right-[20%] top-[17%] h-[7%] w-[7%] rounded-full bg-pink-200" />
            </>
          )}

          <motion.span
            className={`absolute left-[2%] top-[42%] h-[30%] w-[13%] origin-top rounded-full border-2 border-white/80 ${character.accent} shadow-card dark:border-white/20`}
            animate={settings.walking ? { rotate: [-18, 16, -18], y: [0, -2, 0] } : { rotate: -10 }}
            transition={{ duration: stepDuration, ease: "easeInOut", repeat: Infinity }}
          />
          <motion.span
            className={`absolute right-[2%] top-[42%] h-[30%] w-[13%] origin-top rounded-full border-2 border-white/80 ${character.accent} shadow-card dark:border-white/20`}
            animate={settings.walking ? { rotate: [16, -18, 16], y: [-2, 0, -2] } : { rotate: 10 }}
            transition={{ duration: stepDuration, ease: "easeInOut", repeat: Infinity }}
          />

          <motion.span
            className={`absolute bottom-0 left-[24%] h-[12%] w-[20%] rounded-full ${character.paw}`}
            animate={settings.walking ? { rotate: [20, -16, 20], x: [-2, 2, -2] } : { rotate: 4 }}
            transition={{ duration: stepDuration, ease: "easeInOut", repeat: Infinity }}
          />
          <motion.span
            className={`absolute bottom-0 right-[24%] h-[12%] w-[20%] rounded-full ${character.paw}`}
            animate={settings.walking ? { rotate: [-16, 20, -16], x: [2, -2, 2] } : { rotate: -4 }}
            transition={{ duration: stepDuration, ease: "easeInOut", repeat: Infinity }}
          />

          <motion.span
            className={`absolute bottom-[32%] right-[-8%] h-[10%] w-[34%] origin-left rounded-full ${character.accent} shadow-card`}
            animate={
              settings.walking || settings.idleAnimations !== false
                ? { rotate: settings.characterType === "lion" ? [12, -10, 12] : settings.characterType === "cat" ? [42, 10, 42] : [16, -18, 16] }
                : { rotate: 12 }
            }
            transition={{ duration: settings.characterType === "hamster" ? 0.6 : 1.1, ease: "easeInOut", repeat: Infinity }}
          />
          {settings.characterType === "lion" && (
            <motion.span
              className="absolute bottom-[37%] right-[-13%] h-[13%] w-[13%] rounded-full bg-orange-300 shadow-card"
              animate={settings.walking ? { scale: [1, 1.15, 1] } : { scale: [1, 1.08, 1] }}
              transition={{ duration: 1, ease: "easeInOut", repeat: Infinity }}
            />
          )}

          <AnimatePresence>
            {reactionId && (
              <motion.div
                key={reactionId}
                className="pointer-events-none absolute -inset-8"
                initial={{ opacity: 0, scale: 0.55, y: 18 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: settings.characterType === "hamster" ? [0.75, 1.45, 1.05, 1.22] : [0.75, 1.34, 1.08, 1.18],
                  rotate: settings.characterType === "hamster" ? [0, 24, -24, 10] : [0, -12, 12, 0],
                  y: [18, -30, -8, -42],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.65, ease: "easeOut" }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7].map((particle) => (
                  <motion.span
                    key={particle}
                    className="absolute rounded-full bg-rose-300 shadow-[0_0_14px_rgba(251,113,133,0.65)]"
                    style={{
                      height: characterSize * 0.11,
                      width: characterSize * 0.11,
                      left: `${12 + particle * 10}%`,
                      top: `${15 + (particle % 3) * 16}%`,
                    }}
                    animate={{ y: [-2, -52], x: [0, particle % 2 ? 28 : -28], opacity: [1, 0], scale: [0.7, 1.4, 0.3] }}
                    transition={{ duration: 1.45, ease: "easeOut" }}
                  />
                ))}
                <span className="absolute left-[25%] top-0 rounded-full border-2 border-white bg-white/95 px-4 py-2 text-sm font-black text-emerald-700 shadow-[0_12px_34px_rgba(15,23,42,0.18)]">
                  {settings.characterType === "lion" ? "ROAR!" : settings.characterType === "cat" ? "YAY" : "WHEE"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default WalkingCharacter;
