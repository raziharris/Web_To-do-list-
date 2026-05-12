import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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
    stretch: "/characters/indie-cat/idle-3.png",
  },
  react: {
    curious: "/characters/indie-cat/react-0.png",
    excited: "/characters/indie-cat/react-1.png",
    sleep: "/characters/indie-cat/react-2.png",
    jump: "/characters/indie-cat/react-3.png",
  },
};

const catProfiles = {
  cuzi: {
    name: "Cuzi",
    tint: "saturate(1.12) contrast(1.04)",
    accessory: "bandana",
    home: 0.28,
    yOffset: 10,
    speed: 1.16,
    idleDelay: [2800, 6200],
    thoughtDelay: [13000, 23000],
    walkDistance: [90, 260],
    idleActions: ["look", "tailFlick", "stretch", "sit", "blink", "sleep"],
    thoughts: [
      "I can finish this faster than you.",
      "Another task? Easy.",
      "Let's speedrun today.",
      "I saw that. Good job.",
      "Work first, snacks later.",
      "Wait... what was I doing?",
      "This task looks beatable.",
      "One more and we win.",
      "I believe in us.",
      "Tiny steps, big victory.",
      "I'm not lazy, I'm charging.",
      "Boss mode activated.",
      "That task stood no chance.",
      "Can I press the button?",
      "Focus. Then chaos.",
      "We are getting stronger.",
      "Nice one, human.",
      "I smell productivity.",
      "Done means victory.",
      "Okay, now I deserve a nap.",
    ],
    completionThoughts: ["YES! Task crushed!", "Done means victory!", "Nice one, human!", "Big happy cat energy!"],
  },
  cunim: {
    name: "Cunim",
    tint: "hue-rotate(338deg) saturate(0.92) brightness(1.08)",
    accessory: "bow",
    home: 0.66,
    yOffset: 34,
    speed: 0.86,
    idleDelay: [3600, 7600],
    thoughtDelay: [16000, 28000],
    walkDistance: [55, 170],
    idleActions: ["sit", "blink", "look", "stretch", "sleep", "tailFlick"],
    thoughts: [
      "Take it one task at a time.",
      "You're doing fine.",
      "Small progress still counts.",
      "Let's keep today gentle.",
      "Breathe first, then continue.",
      "I'm proud of this little progress.",
      "No rush, just steady steps.",
      "This task can be simple.",
      "You handled that well.",
      "A calm mind works better.",
      "Let's make the list lighter.",
      "One completed task is already good.",
      "Stay soft, stay focused.",
      "We can do this slowly.",
      "Your effort matters.",
      "Rest is part of progress.",
      "That was a lovely win.",
      "Keep going, gently.",
      "Today does not need to be perfect.",
      "I'll stay here with you.",
    ],
    completionThoughts: ["That was a lovely win!", "You handled that so well!", "Small progress, big happy!", "I'm so proud of you!"],
  },
};

const walkFrameSequence = [0, 1, 2, 3, 2, 1];

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function WalkingCharacter({ profile = "cuzi", reactionId, lane = 0 }) {
  const cat = catProfiles[profile] || catProfiles.cuzi;
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1024 : window.innerWidth,
    height: typeof window === "undefined" ? 720 : window.innerHeight,
  }));
  const [walkFrame, setWalkFrame] = useState(0);
  const [idleAction, setIdleAction] = useState("sit");
  const [isWalking, setIsWalking] = useState(false);
  const [direction, setDirection] = useState(profile === "cunim" ? -1 : 1);
  const [thought, setThought] = useState(null);
  const [celebrating, setCelebrating] = useState(false);
  const moveTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const thoughtTimerRef = useRef(null);
  const thoughtHideTimerRef = useRef(null);
  const celebrationTimerRef = useRef(null);
  const rawX = useMotionValue(0);
  const smoothX = useSpring(rawX, { stiffness: cat.speed > 1 ? 62 : 42, damping: cat.speed > 1 ? 18 : 24, mass: 0.85 });

  const responsiveScale = viewport.width < 640 ? 0.68 : 0.78;
  const size = Math.min(76 * responsiveScale, Math.max(viewport.width - 48, 52));
  const leftEdge = 18 + lane * 8;
  const rightEdge = Math.max(leftEdge, viewport.width - size - 22 - lane * 8);
  const gardenHeight = Math.max(230, viewport.height * 0.32);
  const y = Math.min(gardenHeight - size * 0.76 - 18, 58 + cat.yOffset);
  const stepDuration = profile === "cuzi" ? 0.44 : 0.68;
  const spriteSrc = isWalking
    ? pixelCatSprites.walk[walkFrameSequence[walkFrame]]
    : celebrating
      ? pixelCatSprites.react.excited
      : idleAction === "sleep"
        ? pixelCatSprites.react.sleep
        : idleAction === "stretch"
          ? pixelCatSprites.idle.stretch
          : idleAction === "blink"
            ? pixelCatSprites.idle.blink
            : idleAction === "look" || idleAction === "tailFlick"
              ? pixelCatSprites.idle.look
              : pixelCatSprites.idle.sit;

  function showThought(message) {
    window.clearTimeout(thoughtHideTimerRef.current);
    setThought({ id: `${profile}-${Date.now()}-${Math.random()}`, text: message || pickRandom(cat.thoughts) });
    thoughtHideTimerRef.current = window.setTimeout(() => setThought(null), 4200);
  }

  function scheduleThought() {
    window.clearTimeout(thoughtTimerRef.current);
    thoughtTimerRef.current = window.setTimeout(() => {
      showThought();
      scheduleThought();
    }, randomBetween(cat.thoughtDelay[0], cat.thoughtDelay[1]));
  }

  function scheduleIdle() {
    window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      if (!isWalking && !celebrating) {
        setIdleAction(pickRandom(cat.idleActions));
      }
      scheduleIdle();
    }, randomBetween(cat.idleDelay[0], cat.idleDelay[1]));
  }

  function scheduleWalk(fromX = rawX.get()) {
    window.clearTimeout(moveTimerRef.current);
    const delay = randomBetween(profile === "cuzi" ? 700 : 1600, profile === "cuzi" ? 1900 : 3400);

    moveTimerRef.current = window.setTimeout(() => {
      const distance = randomBetween(cat.walkDistance[0], cat.walkDistance[1]);
      const nearLeft = fromX < leftEdge + 80;
      const nearRight = fromX > rightEdge - 80;
      const nextDirection = nearLeft ? 1 : nearRight ? -1 : Math.random() > 0.5 ? 1 : -1;
      const target = Math.min(rightEdge, Math.max(leftEdge, fromX + nextDirection * distance));
      const duration = Math.max(900, (Math.abs(target - fromX) / (cat.speed > 1 ? 150 : 95)) * 1000);

      setDirection(nextDirection);
      setIsWalking(true);
      setIdleAction("sit");
      rawX.set(target);

      window.clearTimeout(moveTimerRef.current);
      moveTimerRef.current = window.setTimeout(() => {
        setIsWalking(false);
        setIdleAction(profile === "cuzi" && Math.random() > 0.55 ? "tailFlick" : "sit");
        scheduleWalk(target);
      }, duration);
    }, delay);
  }

  useEffect(() => {
    function handleResize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const startX = Math.min(rightEdge, Math.max(leftEdge, viewport.width * cat.home - size / 2));
    rawX.set(startX);
    scheduleWalk(startX);
    scheduleIdle();
    scheduleThought();

    return () => {
      window.clearTimeout(moveTimerRef.current);
      window.clearTimeout(idleTimerRef.current);
      window.clearTimeout(thoughtTimerRef.current);
      window.clearTimeout(thoughtHideTimerRef.current);
      window.clearTimeout(celebrationTimerRef.current);
    };
  }, [leftEdge, rightEdge, viewport.width, cat.home]);

  useEffect(() => {
    if (!isWalking) {
      setWalkFrame(0);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setWalkFrame((frame) => (frame + 1) % walkFrameSequence.length);
    }, stepDuration * 180);

    return () => window.clearInterval(intervalId);
  }, [isWalking, stepDuration]);

  useEffect(() => {
    if (!reactionId) {
      return;
    }

    setCelebrating(true);
    setIsWalking(false);
    setIdleAction("tailFlick");
    showThought(pickRandom(cat.completionThoughts));
    window.clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = window.setTimeout(() => setCelebrating(false), profile === "cuzi" ? 2800 : 3100);
  }, [reactionId]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] h-[45vh] min-h-[230px] overflow-visible">
      <motion.div
        className="pointer-events-auto absolute left-0 top-0 will-change-transform"
        style={{ x: smoothX, y }}
        onPointerDown={() => showThought()}
      >
        <motion.div
          className="relative"
          animate={
            celebrating
              ? {
                  y: profile === "cuzi" ? [0, -38, 0, -24, 0, -10, 0] : [0, -30, 0, -16, 0],
                  rotate: profile === "cuzi" ? [0, -14, 13, -7, 0] : [0, 10, -8, 0],
                  scale: profile === "cuzi" ? [1, 1.42, 1.18, 1.32, 1] : [1, 1.34, 1.12, 1.24, 1],
                }
              : isWalking
                ? { y: profile === "cuzi" ? [0, -3, 0, -5, 0] : [0, -1.5, 0], rotate: profile === "cuzi" ? [-1.4, 1.4, -1.4] : [-0.45, 0.45, -0.45] }
                : idleAction === "stretch"
                  ? { y: [0, 3, 0], scaleY: [1, 0.92, 1] }
                  : idleAction === "tailFlick"
                    ? { rotate: [0, 0.8, -0.8, 0] }
                    : idleAction === "sleep"
                      ? { y: [0, 1.5, 0] }
                      : { y: [0, -0.6, 0] }
          }
          transition={{ duration: celebrating ? 1.25 : isWalking ? stepDuration : 1.7, ease: "easeInOut", repeat: isWalking || !celebrating ? Infinity : 0 }}
          style={{ width: size, height: size * 0.72 }}
          aria-label={`${cat.name} cat companion`}
          role="img"
        >
          <motion.span
            className="absolute bottom-[2%] left-[19%] h-[10%] w-[62%] rounded-full bg-slate-950/18"
            animate={isWalking ? { scaleX: [1, 0.9, 1], opacity: [0.17, 0.1, 0.17] } : { scaleX: [1, 0.96, 1], opacity: [0.14, 0.1, 0.14] }}
            transition={{ duration: isWalking ? stepDuration : 1.8, ease: "easeInOut", repeat: Infinity }}
          />

          <img
            src={spriteSrc}
            alt=""
            draggable="false"
            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_5px_0_rgba(15,23,42,0.10)]"
            style={{ imageRendering: "pixelated", filter: cat.tint, transform: `scaleX(${direction}) scale(${celebrating ? 1.34 : 1.22})`, transformOrigin: "center bottom" }}
          />

          {cat.accessory === "bow" && (
            <span className="absolute left-[56%] top-[4%] h-[12%] w-[22%] rotate-12">
              <span className="absolute left-0 top-[18%] h-[64%] w-[44%] bg-pink-300 shadow-[2px_2px_0_rgba(61,48,40,0.22)]" />
              <span className="absolute right-0 top-[18%] h-[64%] w-[44%] bg-pink-300 shadow-[2px_2px_0_rgba(61,48,40,0.22)]" />
              <span className="absolute left-[40%] top-[32%] h-[36%] w-[20%] bg-pink-500" />
            </span>
          )}

          {cat.accessory === "bandana" && (
            <span className="absolute left-[43%] top-[58%] h-[10%] w-[22%] bg-sky-500 shadow-[2px_2px_0_rgba(61,48,40,0.22)]" />
          )}

          <span className="absolute left-[22%] top-[82%] border-2 border-[#3d3028] bg-[#fff1c7] px-2 py-0.5 text-[10px] font-black leading-none text-[#8b4a25] shadow-[3px_3px_0_rgba(61,48,40,0.18)]">
            {cat.name}
          </span>

          <AnimatePresence>
            {celebrating && (
              <motion.div
                className="pointer-events-none absolute -inset-12"
                initial={{ opacity: 0, scale: 0.42, rotate: -10 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.42, 1.36, 1.1, 1.62], rotate: [-10, 8, -4, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.25, ease: "easeOut" }}
              >
                <motion.span
                  className="absolute left-[17%] top-[18%] h-[68%] w-[68%] rounded-full border-4 border-[#f6c247]/70"
                  animate={{ opacity: [0.9, 0], scale: [0.55, 1.55] }}
                  transition={{ duration: 1.05, ease: "easeOut", repeat: 1, repeatDelay: 0.18 }}
                />
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((heart) => (
                  <motion.span
                    key={heart}
                    className={`absolute font-black ${heart % 3 === 0 ? "text-2xl text-[#f6c247]" : "text-xl text-pink-500"}`}
                    style={{ left: `${10 + heart * 9}%`, top: `${6 + (heart % 3) * 18}%` }}
                    animate={{
                      y: [-4, -72 - (heart % 3) * 10],
                      x: [0, heart % 2 ? 34 : -34],
                      opacity: [0, 1, 1, 0],
                      scale: [0.45, 1.75, 1.1, 0.35],
                      rotate: [0, heart % 2 ? 24 : -24],
                    }}
                    transition={{ duration: 1.75, ease: "easeOut", delay: heart * 0.035 }}
                  >
                    {heart % 3 === 0 ? "*" : "\u2665"}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {thought && (
            <motion.div
              key={thought.id}
              className="pointer-events-none absolute bottom-[72%] left-[48%] z-50"
              initial={{ opacity: 0, scale: 0.72, y: 10 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.72, 1.03, 1, 0.96], y: [10, -2, -5, -12] }}
              exit={{ opacity: 0, scale: 0.86 }}
              transition={{ duration: 3.8, ease: "easeOut" }}
            >
              <span className="block w-max max-w-[190px] border-[3px] border-[#3d3028] bg-[#fff1c7] px-3 py-2 text-left text-sm font-black leading-tight text-[#8b4a25] shadow-[5px_5px_0_rgba(61,48,40,0.18)] [direction:ltr]">
                {thought.text}
              </span>
              <span className="absolute -bottom-2 left-5 h-4 w-4 rotate-45 border-b-[3px] border-r-[3px] border-[#3d3028] bg-[#fff1c7]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default WalkingCharacter;
