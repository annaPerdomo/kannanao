"use client";
import { useRef } from "react";
import { Box, Typography, keyframes } from "@mui/material";

// --- Animations ---
const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(-5deg) scale(1); }
  30%       { transform: translateY(-20px) rotate(4deg) scale(1.08); }
  60%       { transform: translateY(-10px) rotate(-3deg) scale(1.04); }
`;

const shimmer = keyframes`
  0%   { background-position: -300% center; }
  100% { background-position:  300% center; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50%       { opacity: 1;   transform: scale(1.1); }
`;

const popIn = keyframes`
  0%   { opacity: 0; transform: scale(0.5) rotate(-10deg); }
  70%  { transform: scale(1.12) rotate(3deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
`;

// Sparkle particles orbiting the kanji
const orbit0 = keyframes`
  0%   { transform: rotate(0deg)   translateX(52px) scale(1);   opacity: 1; }
  50%  { transform: rotate(180deg) translateX(52px) scale(0.6); opacity: 0.5; }
  100% { transform: rotate(360deg) translateX(52px) scale(1);   opacity: 1; }
`;
const orbit1 = keyframes`
  0%   { transform: rotate(60deg)  translateX(44px) scale(0.8); opacity: 0.7; }
  50%  { transform: rotate(240deg) translateX(44px) scale(1.1); opacity: 1; }
  100% { transform: rotate(420deg) translateX(44px) scale(0.8); opacity: 0.7; }
`;
const orbit2 = keyframes`
  0%   { transform: rotate(120deg) translateX(58px) scale(1.1); opacity: 0.9; }
  50%  { transform: rotate(300deg) translateX(58px) scale(0.7); opacity: 0.5; }
  100% { transform: rotate(480deg) translateX(58px) scale(1.1); opacity: 0.9; }
`;
const orbit3 = keyframes`
  0%   { transform: rotate(200deg) translateX(46px) scale(0.9); opacity: 0.6; }
  50%  { transform: rotate(380deg) translateX(46px) scale(1.2); opacity: 1; }
  100% { transform: rotate(560deg) translateX(46px) scale(0.9); opacity: 0.6; }
`;
const orbit4 = keyframes`
  0%   { transform: rotate(300deg) translateX(54px) scale(1);   opacity: 0.8; }
  50%  { transform: rotate(480deg) translateX(54px) scale(0.7); opacity: 0.4; }
  100% { transform: rotate(660deg) translateX(54px) scale(1);   opacity: 0.8; }
`;

const SPARKLE_ORBITS = [orbit0, orbit1, orbit2, orbit3, orbit4];
const SPARKLE_DURATIONS = ["3.2s", "2.8s", "3.8s", "3s", "2.6s"];
const SPARKLE_CHARS = ["✦", "⋆", "✸", "✺", "✷"];
const SPARKLE_COLORS = ["#F9A8D4", "#F472B6", "#FBCFE8", "#BE185D", "#FDF2F8"];

const slowFade = keyframes`
  0%, 12%   { opacity: 1; }
  14%, 100% { opacity: 0; }
`;

const KANJI = [
  { char: "学", label: "learn" },
  { char: "語", label: "language" },
  { char: "花", label: "flower" },
  { char: "星", label: "star" },
  { char: "夢", label: "dream" },
  { char: "心", label: "heart" },
  { char: "空", label: "sky" },
  { char: "愛", label: "love" },
];

interface LoadingProps {
  message?: string;
}

export function Loading({ message = "Loading…" }: LoadingProps) {
  const kanjiRef = useRef([...KANJI].sort(() => Math.random() - 0.5));
  const shuffledKanji = kanjiRef.current;
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        gap: 2,
      }}
    >
      {/* Kanji + orbiting sparkles */}
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 140,
          height: 140,
        }}
      >
        {/* Soft glow behind the character */}
        <Box
          sx={{
            position: "absolute",
            width: 90,
            height: 90,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(249,168,212,0.35) 0%, transparent 70%)",
            animation: `${pulse} 2s ease-in-out infinite`,
          }}
        />

        {/* Orbiting sparkle particles */}
        {SPARKLE_CHARS.map((s, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              width: 0,
              height: 0,
              animation: `${SPARKLE_ORBITS[i]} ${SPARKLE_DURATIONS[i]} linear infinite`,
            }}
          >
            <Typography
              component="span"
              sx={{
                fontSize: i % 2 === 0 ? "0.75rem" : "0.55rem",
                color: SPARKLE_COLORS[i],
                display: "block",
                transform: "translateX(-50%) translateY(-50%)",
                filter: "drop-shadow(0 0 4px rgba(249,168,212,0.9))",
                lineHeight: 1,
              }}
            >
              {s}
            </Typography>
          </Box>
        ))}

        {/* The kanji itself */}
        <Box sx={{ position: "relative", width: "4.5rem", height: "4.5rem" }}>
          {shuffledKanji.map((k, i) => (
            <Box
              key={k.char}
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.75,
                opacity: 0,
                animation: `${slowFade} ${KANJI.length * 3}s ease-in-out infinite`,
                animationDelay: `${i * 3}s`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Noto Serif JP", serif',
                  fontSize: "4.5rem",
                  lineHeight: 1,
                  background:
                    "linear-gradient(135deg, #F9A8D4 0%, #BE185D 35%, #F472B6 60%, #FBCFE8 100%)",
                  backgroundSize: "300% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: `${popIn} 0.5s cubic-bezier(0.34,1.56,0.64,1) both, ${shimmer} 4s linear infinite`,
                  filter: "drop-shadow(0 4px 12px rgba(249,168,212,0.6))",
                }}
              >
                {k.char}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(190,24,93,0.5)",
                  animation: `${pulse} 2.2s ease-in-out infinite`,
                }}
              >
                {k.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Bouncing dots */}
      <Box sx={{ display: "flex", gap: 0.75 }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              bgcolor: i === 1 ? "#F472B6" : "#F9A8D4",
              animation: `${pulse} 1s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </Box>

      <Typography
        variant="caption"
        sx={{
          color: "rgba(190,24,93,0.5)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontSize: "0.62rem",
        }}
      >
        {message}
      </Typography>
    </Box>
  );
}
