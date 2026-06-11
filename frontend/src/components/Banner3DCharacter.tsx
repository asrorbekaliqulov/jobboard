import React from "react";

interface Banner3DCharacterProps {
  variant: "employer" | "worker";
  size?: number;
  className?: string;
}

/**
 * A 3D-style transparent person character for the banner.
 * Uses SVG with gradients and shadows to achieve a 3D glass/translucent look.
 */
const Banner3DCharacter: React.FC<Banner3DCharacterProps> = ({
  variant,
  size = 104,
  className = "",
}) => {
  if (variant === "employer") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`drop-shadow-2xl ${className}`}
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.7)" />
          </linearGradient>
          <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(30,27,75,0.9)" />
            <stop offset="50%" stopColor="rgba(55,48,163,0.85)" />
            <stop offset="100%" stopColor="rgba(79,70,229,0.8)" />
          </linearGradient>
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf7a" />
            <stop offset="100%" stopColor="#f59e4b" />
          </linearGradient>
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a3728" />
            <stop offset="100%" stopColor="#2d1f14" />
          </linearGradient>
          <filter id="softShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="rgba(0,0,0,0.2)" />
          </filter>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Body / Suit */}
        <ellipse cx="60" cy="105" rx="28" ry="22" fill="url(#suitGrad)" filter="url(#softShadow)" />

        {/* Suit details - shoulders */}
        <path
          d="M32 105 C32 88 44 78 60 78 C76 78 88 88 88 105"
          fill="url(#suitGrad)"
          filter="url(#softShadow)"
        />

        {/* Shirt / Collar */}
        <path
          d="M52 78 L55 90 L60 85 L65 90 L68 78"
          fill="rgba(255,255,255,0.9)"
        />

        {/* Tie */}
        <path
          d="M57 85 L60 88 L63 85 L61 100 L60 102 L59 100 Z"
          fill="rgba(99,102,241,0.9)"
        />

        {/* Neck */}
        <rect x="55" y="62" width="10" height="18" rx="5" fill="url(#skinGrad)" />

        {/* Head */}
        <ellipse cx="60" cy="45" rx="18" ry="20" fill="url(#skinGrad)" filter="url(#softShadow)" />

        {/* Hair */}
        <path
          d="M42 40 C42 28 50 22 60 22 C70 22 78 28 78 40 C78 36 74 30 60 30 C46 30 42 36 42 40 Z"
          fill="url(#hairGrad)"
        />

        {/* Eyes */}
        <ellipse cx="52" cy="44" rx="2.5" ry="3" fill="#1e1b4b" />
        <ellipse cx="68" cy="44" rx="2.5" ry="3" fill="#1e1b4b" />
        <circle cx="51" cy="43" r="1" fill="rgba(255,255,255,0.7)" />
        <circle cx="67" cy="43" r="1" fill="rgba(255,255,255,0.7)" />

        {/* Eyebrows */}
        <path d="M48 39 Q52 37 56 39" stroke="#3d2c1e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M64 39 Q68 37 72 39" stroke="#3d2c1e" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Smile */}
        <path d="M54 52 Q60 57 66 52" stroke="#c2410c" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Briefcase in hand */}
        <rect x="82" y="88" width="14" height="11" rx="2" fill="rgba(180,130,60,0.9)" filter="url(#softShadow)" />
        <rect x="86" y="86" width="6" height="3" rx="1.5" fill="rgba(160,110,40,0.9)" />

        {/* Glass/shine effect on body */}
        <ellipse cx="50" cy="92" rx="8" ry="12" fill="rgba(255,255,255,0.08)" />
      </svg>
    );
  }

  // Worker variant
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-2xl ${className}`}
    >
      <defs>
        <linearGradient id="workerBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(59,130,246,0.9)" />
          <stop offset="50%" stopColor="rgba(37,99,235,0.85)" />
          <stop offset="100%" stopColor="rgba(29,78,216,0.8)" />
        </linearGradient>
        <linearGradient id="workerSkinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf7a" />
          <stop offset="100%" stopColor="#f59e4b" />
        </linearGradient>
        <linearGradient id="workerHairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>
        <filter id="workerShadow">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="rgba(0,0,0,0.2)" />
        </filter>
      </defs>

      {/* Body / T-shirt */}
      <ellipse cx="60" cy="105" rx="28" ry="22" fill="url(#workerBodyGrad)" filter="url(#workerShadow)" />

      {/* T-shirt shape */}
      <path
        d="M32 105 C32 88 44 78 60 78 C76 78 88 88 88 105"
        fill="url(#workerBodyGrad)"
        filter="url(#workerShadow)"
      />

      {/* Collar */}
      <path
        d="M50 78 Q60 84 70 78"
        fill="rgba(255,255,255,0.15)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
      />

      {/* Neck */}
      <rect x="55" y="62" width="10" height="18" rx="5" fill="url(#workerSkinGrad)" />

      {/* Head */}
      <ellipse cx="60" cy="45" rx="18" ry="20" fill="url(#workerSkinGrad)" filter="url(#workerShadow)" />

      {/* Hair */}
      <path
        d="M42 42 C42 26 50 20 60 20 C70 20 78 26 78 42 C78 35 73 27 60 27 C47 27 42 35 42 42 Z"
        fill="url(#workerHairGrad)"
      />

      {/* Eyes */}
      <ellipse cx="52" cy="44" rx="2.5" ry="3" fill="#1e1b4b" />
      <ellipse cx="68" cy="44" rx="2.5" ry="3" fill="#1e1b4b" />
      <circle cx="51" cy="43" r="1" fill="rgba(255,255,255,0.7)" />
      <circle cx="67" cy="43" r="1" fill="rgba(255,255,255,0.7)" />

      {/* Eyebrows */}
      <path d="M48 39 Q52 37 56 39" stroke="#1e1b4b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M64 39 Q68 37 72 39" stroke="#1e1b4b" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Smile */}
      <path d="M54 52 Q60 57 66 52" stroke="#c2410c" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Laptop in hand */}
      <rect x="76" y="90" width="18" height="12" rx="2" fill="rgba(100,116,139,0.85)" filter="url(#workerShadow)" />
      <rect x="77" y="91" width="16" height="9" rx="1" fill="rgba(200,220,255,0.6)" />

      {/* Glass/shine effect on body */}
      <ellipse cx="50" cy="92" rx="8" ry="12" fill="rgba(255,255,255,0.08)" />
    </svg>
  );
};

export default Banner3DCharacter;
