import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

const pixelCatSprites = {
  walk: [
    "/characters/indie-cat/walk-0.png",
    "/characters/indie-cat/walk-1.png",
    "/characters/indie-cat/walk-2.png",
    "/characters/indie-cat/walk-3.png",
  ],
  idle: {
    sit: "/characters/indie-cat/idle-0.png",
    blink: "/characters/indie-cat/idle-1.png",
    look: "/characters/indie-cat/idle-2.png",
    yawn: "/characters/indie-cat/idle-3.png",
  },
  react: {
    surprised: "/characters/indie-cat/react-0.png",
    excited: "/characters/indie-cat/react-1.png",
    sleep: "/characters/indie-cat/react-2.png",
    pounce: "/characters/indie-cat/react-3.png",
  },
};

const idleActions = ["sit", "blink", "look", "yawn", "sleep", "pounce", "tailWatch"];
const walkFrameSequence = [0, 1, 1, 2, 3, 3, 2, 1];
const emotionDuration = {
  happy: 2200,
  excited: 3000,
  confused: 2200,
  sleepy: 3600,
  surprised: 1200,
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function WalkingCharacter({ settings, reactionId, lane = 0 }) {
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === "undefined" ? 1024 : window.innerWidth));
  const [walkFrameStep, setWalkFrameStep] = useState(0);
  const [emotion, setEmotion] = useState("neutral");
  const [idleAction, setIdleAction] = useState("sit");
  const [cursor, setCursor] = useState({ x: 0.5, near: false, fast: false });
  const [attentionPulse, setAttentionPulse] = useState(0);
  const [picturePopup, setPicturePopup] = useState(null);
  const lastPointerRef = useRef({ x: 0, y: 0, time: Date.now() });
  const emotionTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const pictureTimerRef = useRef(null);

  useEffect(() => {
    function updateViewportWidth() {
      setViewportWidth(window.innerWidth);
    }

    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  const responsiveScale = viewportWidth < 640 ? 0.82 : 1;
  const characterSize = Math.min(settings.size * responsiveScale * 1.55, Math.max(viewportWidth - 36, 72));
  const edgePadding = viewportWidth < 640 ? 8 : 18;
  const leftEdge = edgePadding + lane * 12;
  const rightEdge = Math.max(leftEdge, viewportWidth - characterSize - edgePadding);
  const speedProgress = Math.min(Math.max(((settings.speed ?? 14) - 1) / 29, 0), 1);
  const walkDuration = 26 - speedProgress * 14;
  const stepDuration = 0.82 - speedProgress * 0.28;
  const pauseDuration = (settings.pauseDuration ?? 0.8) * 0.72;
  const totalDuration = walkDuration + pauseDuration * 2;
  const pauseStep = pauseDuration / totalDuration;
  const timeline = useMemo(
    () => {
      const outStart = pauseStep;
      const outEnd = 0.5 - pauseStep;
      const backStart = 0.5 + pauseStep;
      const backEnd = 1 - pauseStep;
      const outboundStride = [0.07, 0.15, 0.27, 0.34, 0.48, 0.56, 0.69, 0.77, 0.9, 0.96];
      const returnStride = [0.93, 0.82, 0.72, 0.61, 0.5, 0.39, 0.28, 0.18, 0.09, 0.04];
      const strideTimes = [0.07, 0.16, 0.25, 0.35, 0.46, 0.56, 0.67, 0.78, 0.9, 0.96];
      const mapTime = (start, end, amount) => lerp(start, end, amount);

      return {
        x: [
          leftEdge,
          leftEdge,
          ...outboundStride.map((amount, index) => lerp(leftEdge, rightEdge, amount) + (index % 2 === 0 ? -1.2 : 1.6)),
          rightEdge,
          rightEdge,
          ...returnStride.map((amount, index) => lerp(leftEdge, rightEdge, amount) + (index % 2 === 0 ? 1.2 : -1.6)),
          leftEdge,
          leftEdge,
        ],
        xTimes: [
          0,
          outStart,
          ...strideTimes.map((amount) => mapTime(outStart, outEnd, amount)),
          0.5 - pauseStep * 0.18,
          0.5 + pauseStep * 0.72,
          ...strideTimes.map((amount) => mapTime(backStart, backEnd, amount)),
          1 - pauseStep * 0.16,
          1,
        ],
        scaleX: [1, 1, 1, 0.88, -1, -1, -1, -0.88, 1],
        scaleTimes: [0, outStart, 0.5 - pauseStep * 0.55, 0.5 - pauseStep * 0.18, 0.5, backStart, 1 - pauseStep * 0.55, 1 - pauseStep * 0.18, 1],
      };
    },
    [leftEdge, pauseStep, rightEdge],
  );
  const walkingAreaHeight = Math.max(settings.walkingAreaHeight ?? 120, characterSize * 0.72 + 22 + lane * 12);
  const idleEnabled = settings.idleAnimations !== false;
  const activeEmotion = emotion === "neutral" && cursor.near ? "confused" : emotion;

  function showEmotion(nextEmotion, duration = emotionDuration[nextEmotion] ?? 1800) {
    window.clearTimeout(emotionTimerRef.current);
    setEmotion(nextEmotion);
    emotionTimerRef.current = window.setTimeout(() => setEmotion("neutral"), duration);
  }

  function showPicturePopup() {
    const images = settings.popupImages || [];

    if (images.length === 0) {
      return;
    }

    window.clearTimeout(pictureTimerRef.current);
    setPicturePopup({
      id: `${Date.now()}-${Math.random()}`,
      src: images[Math.floor(Math.random() * images.length)],
    });
    pictureTimerRef.current = window.setTimeout(() => setPicturePopup(null), 2600);
  }

  function resetInactivity() {
    window.clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = window.setTimeout(() => {
      setIdleAction("sleep");
      showEmotion("sleepy", 4200);
    }, 45000);
  }

  useEffect(() => () => {
    window.clearTimeout(emotionTimerRef.current);
    window.clearTimeout(inactivityTimerRef.current);
    window.clearTimeout(pictureTimerRef.current);
  }, []);

  useEffect(() => {
    if (!settings.walking) {
      setWalkFrameStep(0);
      return undefined;
    }

    let timeoutId;
    let cancelled = false;

    function queueNextStep(currentStep = walkFrameStep) {
      const cadence = [1.18, 0.72, 0.86, 1.08, 0.78, 0.92, 1.14, 0.84];
      const delay = Math.max(stepDuration * 245 * cadence[currentStep % cadence.length], 95);

      timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        const nextStep = (currentStep + 1) % walkFrameSequence.length;
        setWalkFrameStep(nextStep);
        queueNextStep(nextStep);
      }, delay);
    }

    queueNextStep();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [settings.walking, stepDuration]);

  useEffect(() => {
    if (!idleEnabled) {
      return undefined;
    }

    let timeoutId;
    let cancelled = false;

    function scheduleIdle() {
      timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        const nextAction = idleActions[Math.floor(Math.random() * idleActions.length)];
        setIdleAction(nextAction);

        if (nextAction === "sleep") {
          showEmotion("sleepy", 3400);
        } else if (nextAction === "pounce" || nextAction === "tailWatch") {
          showEmotion("confused", 2200);
        }

        window.setTimeout(() => {
          if (!cancelled) {
            setIdleAction("sit");
            scheduleIdle();
          }
        }, randomBetween(1600, 3600));
      }, randomBetween(2800, 8200));
    }

    scheduleIdle();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [idleEnabled]);

  useEffect(() => {
    function handlePointerMove(event) {
      const now = Date.now();
      const lastPointer = lastPointerRef.current;
      const distance = Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y);
      const elapsed = Math.max(now - lastPointer.time, 16);
      const speed = distance / elapsed;
      const nearBottom = event.clientY > window.innerHeight - walkingAreaHeight - 80;

      setCursor({
        x: event.clientX / Math.max(window.innerWidth, 1),
        near: nearBottom,
        fast: speed > 2.2,
      });

      if (speed > 2.8) {
        setIdleAction("pounce");
        showEmotion("surprised", 900);
        setAttentionPulse((value) => value + 1);
      }

      lastPointerRef.current = { x: event.clientX, y: event.clientY, time: now };
      resetInactivity();
    }

    window.addEventListener("pointermove", handlePointerMove);
    resetInactivity();
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [walkingAreaHeight]);

  useEffect(() => {
    if (!reactionId) {
      return;
    }

    setIdleAction("pounce");
    showEmotion(Math.random() > 0.35 ? "excited" : "happy", 3200);
    showPicturePopup();
    setAttentionPulse((value) => value + 1);
    const timeoutId = window.setTimeout(() => setIdleAction("sit"), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [reactionId]);

  if (!settings.enabled) {
    return null;
  }

  const spriteSrc = settings.walking
    ? pixelCatSprites.walk[walkFrameSequence[walkFrameStep]]
    : activeEmotion === "surprised"
      ? pixelCatSprites.react.surprised
      : activeEmotion === "excited" || activeEmotion === "happy"
        ? pixelCatSprites.react.excited
        : idleAction === "sleep" || activeEmotion === "sleepy"
          ? pixelCatSprites.react.sleep
          : idleAction === "pounce"
            ? pixelCatSprites.react.pounce
            : idleAction === "blink"
              ? pixelCatSprites.idle.blink
              : idleAction === "look" || idleAction === "tailWatch" || activeEmotion === "confused"
                ? pixelCatSprites.idle.look
                : idleAction === "yawn"
                  ? pixelCatSprites.idle.yawn
                  : pixelCatSprites.idle.sit;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-2 z-[70] overflow-visible sm:bottom-4"
      style={{ height: walkingAreaHeight, bottom: 8 + lane * 18 }}
    >
      <motion.div
        key={`pixel-cat-walk-${settings.speed}-${settings.pauseDuration}-${characterSize}-${viewportWidth}`}
        className="pointer-events-auto absolute bottom-1 will-change-transform"
        initial={{ x: leftEdge }}
        animate={settings.walking ? { x: timeline.x } : { x: leftEdge }}
        transition={
          settings.walking
            ? { duration: totalDuration, times: timeline.xTimes, ease: "easeInOut", repeat: Infinity }
            : { duration: 0.45, ease: "easeOut" }
        }
      >
        <motion.div
          className="relative"
          animate={
            settings.walking
              ? {
                  scaleX: timeline.scaleX,
                  y: [0, -0.5, -3.2, -1.1, 0, -2.4, -0.7, 0],
                  rotate: [0, -0.45, 0.65, 0.25, -0.55, 0.35, 0],
                }
              : idleEnabled
                ? { y: [0, -1, 0] }
                : { y: 0 }
          }
          transition={
            settings.walking
              ? {
                  scaleX: { duration: totalDuration, times: timeline.scaleTimes, ease: "easeInOut", repeat: Infinity },
                  y: { duration: stepDuration * 2.05, ease: "easeInOut", repeat: Infinity },
                  rotate: { duration: stepDuration * 2.05, ease: "easeInOut", repeat: Infinity },
                }
              : { duration: 2, ease: "easeInOut", repeat: Infinity }
          }
          style={{ width: characterSize, height: characterSize * 0.72 }}
          onPointerEnter={() => showEmotion("confused", 1500)}
          onPointerDown={() => {
            setIdleAction("pounce");
            showEmotion("happy", 2200);
            showPicturePopup();
            setAttentionPulse((value) => value + 1);
          }}
        >
          <motion.span
            className="absolute bottom-[4%] left-[18%] h-[11%] w-[64%] rounded-full bg-slate-950/18"
            animate={
              settings.walking
                ? { x: [0, 3, 1, -2, 0], scaleX: [1, 0.82, 0.95, 0.88, 1], opacity: [0.18, 0.09, 0.14, 0.1, 0.18] }
                : idleEnabled
                  ? { scaleX: [1, 0.96, 1], opacity: [0.16, 0.12, 0.16] }
                  : { scaleX: 1, opacity: 0.14 }
            }
            transition={{ duration: settings.walking ? stepDuration * 2.05 : 1.8, ease: "easeInOut", repeat: Infinity }}
          />

          <motion.img
            src={spriteSrc}
            alt=""
            draggable="false"
            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_7px_0_rgba(15,23,42,0.10)]"
            style={{ imageRendering: "pixelated", transformOrigin: "center bottom" }}
            animate={
              settings.walking
                ? {
                    x: [0, 2.4, 0.8, -1.9, -0.5, 1.2, 0],
                    y: [0, -3.6, -0.9, -2.8, -0.4, -1.4, 0],
                    rotate: [-1.2, 1.55, 0.25, -1.45, -0.35, 0.9, -1.2],
                    scaleX: [1.28, 1.3, 1.27, 1.305, 1.285, 1.295, 1.28],
                    scaleY: [1.28, 1.255, 1.29, 1.26, 1.285, 1.27, 1.28],
                  }
                : idleEnabled
                  ? {
                      y: idleAction === "pounce" ? [0, -7, 0] : [0, -1, 0],
                      x: cursor.near && cursor.fast ? (cursor.x > 0.5 ? -7 : 7) : 0,
                      scale: idleAction === "sleep" ? 1.18 : 1.28,
                    }
                  : { y: 0, x: 0, scale: 1.28 }
            }
            transition={{ duration: idleAction === "pounce" ? 0.75 : settings.walking ? stepDuration * 2.05 : 1.4, ease: "easeInOut", repeat: Infinity }}
          />

          <AnimatePresence>
            {picturePopup && (
              <motion.div
                key={picturePopup.id}
                className="pointer-events-none absolute left-[58%] top-[-58%] z-40"
                initial={{ opacity: 0, scale: 0.55, y: 18 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.55, 1.08, 1, 0.96], y: [18, -6, -10, -18] }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 2.55, ease: "easeOut" }}
              >
                <span
                  className="block overflow-hidden border-[3px] border-[#3d3028] bg-[#fff1c7] p-1 shadow-[6px_6px_0_rgba(61,48,40,0.18)]"
                  style={{ width: characterSize * 0.82, height: characterSize * 0.66 }}
                >
                  <img src={picturePopup.src} alt="" className="h-full w-full object-cover" />
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {(activeEmotion !== "neutral" || idleAction !== "sit") && (
              <motion.div
                key={`${activeEmotion}-${idleAction}-${attentionPulse}`}
                className="absolute left-[68%] top-[-16%] z-30"
                initial={{ opacity: 0, scale: 0.55, y: 12 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.55, 1.18, 1.08, 0.98], y: [12, -10, -17, -28] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, ease: "easeOut" }}
              >
                <span
                  className="grid place-items-center border-[3px] border-[#3d3028] bg-[#fff1c7] px-3 py-1.5 text-lg font-black leading-none text-[#8b4a25] shadow-[6px_6px_0_rgba(61,48,40,0.18)]"
                  style={{ minHeight: characterSize * 0.22, minWidth: characterSize * 0.28 }}
                >
                  {activeEmotion === "sleepy" || idleAction === "sleep" ? "zzz" : idleAction === "pounce" || activeEmotion === "surprised" ? "!" : activeEmotion === "confused" ? "?" : "meow"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {reactionId && (
              <motion.div
                key={reactionId}
                className="pointer-events-none absolute -inset-12"
                initial={{ opacity: 0, scale: 0.45, y: 22 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1.32, 1.16, 1.2], y: [22, -34, -12, -50] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.65, ease: "easeOut" }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7].map((particle) => (
                  <motion.span
                    key={particle}
                    className="absolute bg-amber-300 shadow-[3px_3px_0_rgba(139,74,37,0.22)]"
                    style={{
                      height: characterSize * 0.08,
                      width: characterSize * 0.08,
                      left: `${12 + particle * 10}%`,
                      top: `${16 + (particle % 3) * 15}%`,
                    }}
                    animate={{ y: [-2, -62], x: [0, particle % 2 ? 34 : -34], opacity: [1, 0], scale: [0.75, 1.45, 0.3] }}
                    transition={{ duration: 1.45, ease: "easeOut" }}
                  />
                ))}
                <span className="absolute left-[28%] top-[-6%] border-[3px] border-[#3d3028] bg-[#fff1c7] px-5 py-2 text-xl font-black leading-none text-[#8b4a25] shadow-[6px_6px_0_rgba(61,48,40,0.2)]">
                  MEOW!
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
