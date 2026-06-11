import React from "react";

interface Banner3DCharacterProps {
  variant: "employer" | "worker";
  size?: number;
  className?: string;
}

/**
 * Professional 3D isometric character for the banner section.
 * Employer: businessman in a suit holding a tablet, confident stance.
 * Worker: modern casual professional holding a laptop, optimistic look.
 * Uses inline SVG with gradients, shadows, and highlights for 3D depth.
 * Transparent background - designed for indigo/purple gradient banners.
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
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`drop-shadow-2xl ${className}`}
      >
        <defs>
          {/* Skin gradients */}
          <linearGradient id="emp-skin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDDCB5" />
            <stop offset="40%" stopColor="#F5C49A" />
            <stop offset="100%" stopColor="#E8A873" />
          </linearGradient>
          <radialGradient id="emp-skin-face" cx="45%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#FDE8D0" />
            <stop offset="70%" stopColor="#F5C49A" />
            <stop offset="100%" stopColor="#E09960" />
          </radialGradient>

          {/* Suit gradients - deep navy/indigo 3D effect */}
          <linearGradient id="emp-suit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E1B4B" />
            <stop offset="35%" stopColor="#272262" />
            <stop offset="65%" stopColor="#312E81" />
            <stop offset="100%" stopColor="#1E1B4B" />
          </linearGradient>
          <linearGradient id="emp-suit-light" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#3730A3" />
            <stop offset="50%" stopColor="#2E2A7A" />
            <stop offset="100%" stopColor="#1E1B4B" />
          </linearGradient>
          <linearGradient id="emp-suit-right" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#252166" />
            <stop offset="100%" stopColor="#1A1740" />
          </linearGradient>

          {/* Hair gradient */}
          <linearGradient id="emp-hair" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2D2013" />
            <stop offset="50%" stopColor="#1A1209" />
            <stop offset="100%" stopColor="#0F0A05" />
          </linearGradient>

          {/* Shirt/collar */}
          <linearGradient id="emp-shirt" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E8E8F0" />
          </linearGradient>

          {/* Tie gradient */}
          <linearGradient id="emp-tie" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#3730A3" />
          </linearGradient>

          {/* Tablet/device gradient */}
          <linearGradient id="emp-tablet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="50%" stopColor="#1F2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
          <linearGradient id="emp-screen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A5B4FC" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>

          {/* Shadow and glow filters */}
          <filter id="emp-shadow" x="-20%" y="-10%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="rgba(0,0,0,0.3)" />
          </filter>
          <filter id="emp-body-shadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="3" dy="6" stdDeviation="4" floodColor="rgba(0,0,0,0.25)" />
          </filter>
          <filter id="emp-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="emp-highlight">
            <feGaussianBlur stdDeviation="0.8" />
          </filter>

          {/* Glass reflection */}
          <linearGradient id="emp-glass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* === BODY / SUIT === */}
        {/* Suit jacket - main torso */}
        <path
          d="M70 108 C62 108 52 112 48 120 L44 155 C44 160 46 165 52 168 L82 172 L100 174 L118 172 L148 168 C154 165 156 160 156 155 L152 120 C148 112 138 108 130 108 Z"
          fill="url(#emp-suit)"
          filter="url(#emp-body-shadow)"
        />

        {/* Left shoulder highlight */}
        <path
          d="M70 108 C62 108 52 112 48 120 L46 140 C50 135 56 115 72 110 Z"
          fill="url(#emp-suit-light)"
          opacity="0.7"
        />

        {/* Right shoulder shadow */}
        <path
          d="M130 108 C138 108 148 112 152 120 L154 140 C150 135 144 115 128 110 Z"
          fill="url(#emp-suit-right)"
          opacity="0.8"
        />

        {/* Suit lapel left */}
        <path
          d="M85 108 L78 130 L88 135 L95 112 Z"
          fill="#252166"
          opacity="0.9"
        />
        {/* Suit lapel right */}
        <path
          d="M115 108 L122 130 L112 135 L105 112 Z"
          fill="#1E1B4B"
          opacity="0.9"
        />

        {/* White shirt visible between lapels */}
        <path
          d="M88 108 L85 135 L100 140 L115 135 L112 108 Z"
          fill="url(#emp-shirt)"
        />

        {/* Tie */}
        <path
          d="M96 112 L100 116 L104 112 L102 145 L100 148 L98 145 Z"
          fill="url(#emp-tie)"
        />
        {/* Tie knot */}
        <ellipse cx="100" cy="112" rx="4" ry="3" fill="#4F46E5" />

        {/* Suit button */}
        <circle cx="100" cy="152" r="2.5" fill="#3730A3" />
        <circle cx="100" cy="152" r="1" fill="rgba(255,255,255,0.3)" />

        {/* Glass/shine on suit */}
        <path
          d="M65 115 C65 115 70 130 68 155"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />

        {/* === LEFT ARM (holding tablet) === */}
        <path
          d="M48 120 C42 125 38 132 36 140 L34 158 C34 160 35 162 37 162 L42 160 L46 145 L50 130 Z"
          fill="url(#emp-suit)"
          filter="url(#emp-shadow)"
        />
        {/* Left hand */}
        <path
          d="M34 155 C32 158 32 162 34 164 C36 166 40 166 42 164 L44 158 C42 156 38 154 34 155 Z"
          fill="url(#emp-skin)"
        />

        {/* === TABLET === */}
        <rect x="24" y="140" width="22" height="32" rx="3" fill="url(#emp-tablet)" filter="url(#emp-shadow)" transform="rotate(-8 35 156)" />
        <rect x="26" y="143" width="18" height="26" rx="2" fill="url(#emp-screen)" transform="rotate(-8 35 156)" />
        {/* Screen content lines */}
        <rect x="28" y="148" width="12" height="2" rx="1" fill="rgba(255,255,255,0.5)" transform="rotate(-8 35 156)" />
        <rect x="28" y="153" width="10" height="2" rx="1" fill="rgba(255,255,255,0.4)" transform="rotate(-8 35 156)" />
        <rect x="28" y="158" width="14" height="2" rx="1" fill="rgba(255,255,255,0.3)" transform="rotate(-8 35 156)" />
        {/* Screen glow */}
        <rect x="26" y="143" width="18" height="12" rx="2" fill="rgba(255,255,255,0.12)" transform="rotate(-8 35 156)" />

        {/* === RIGHT ARM === */}
        <path
          d="M152 120 C158 125 160 132 161 140 L160 155 C160 157 159 158 157 158 L154 156 L153 140 L150 128 Z"
          fill="url(#emp-suit)"
          filter="url(#emp-shadow)"
        />
        {/* Right hand */}
        <path
          d="M157 153 C159 155 159 158 157 160 C155 162 152 161 151 159 L152 155 C154 153 156 152 157 153 Z"
          fill="url(#emp-skin)"
        />

        {/* === NECK === */}
        <path
          d="M90 95 C90 95 92 108 100 108 C108 108 110 95 110 95"
          fill="url(#emp-skin)"
        />
        <rect x="91" y="92" width="18" height="18" rx="9" fill="url(#emp-skin)" />

        {/* === HEAD === */}
        {/* Head shape - slightly oval */}
        <ellipse cx="100" cy="65" rx="26" ry="30" fill="url(#emp-skin-face)" filter="url(#emp-shadow)" />

        {/* Ear left */}
        <ellipse cx="74" cy="68" rx="5" ry="7" fill="url(#emp-skin)" />
        <ellipse cx="75" cy="68" rx="3" ry="5" fill="#E8A873" opacity="0.5" />

        {/* Ear right */}
        <ellipse cx="126" cy="68" rx="5" ry="7" fill="url(#emp-skin)" />
        <ellipse cx="125" cy="68" rx="3" ry="5" fill="#E8A873" opacity="0.5" />

        {/* Hair - professional short style */}
        <path
          d="M74 55 C74 35 85 28 100 28 C115 28 126 35 126 55 C126 48 120 36 100 36 C80 36 74 48 74 55 Z"
          fill="url(#emp-hair)"
        />
        {/* Hair side left */}
        <path
          d="M74 55 C73 50 74 45 76 42 L74 58 Z"
          fill="url(#emp-hair)"
        />
        {/* Hair side right */}
        <path
          d="M126 55 C127 50 126 45 124 42 L126 58 Z"
          fill="url(#emp-hair)"
        />
        {/* Hair highlight */}
        <path
          d="M85 32 C90 30 95 29 100 28 C95 30 90 33 87 38"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="2"
          fill="none"
        />

        {/* === FACE === */}
        {/* Eyebrows - confident, slightly angled */}
        <path d="M85 55 Q90 52 96 54" stroke="#3D2C1E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M104 54 Q110 52 115 55" stroke="#3D2C1E" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Eyes */}
        <ellipse cx="90" cy="62" rx="5" ry="5.5" fill="white" />
        <ellipse cx="110" cy="62" rx="5" ry="5.5" fill="white" />
        {/* Iris */}
        <ellipse cx="91" cy="62.5" rx="3" ry="3.5" fill="#1E1B4B" />
        <ellipse cx="111" cy="62.5" rx="3" ry="3.5" fill="#1E1B4B" />
        {/* Pupil */}
        <circle cx="91.5" cy="62" r="1.5" fill="#000" />
        <circle cx="111.5" cy="62" r="1.5" fill="#000" />
        {/* Eye highlight */}
        <circle cx="89" cy="60.5" r="1.5" fill="rgba(255,255,255,0.9)" />
        <circle cx="109" cy="60.5" r="1.5" fill="rgba(255,255,255,0.9)" />

        {/* Nose */}
        <path d="M98 65 C98 70 100 73 102 73 C100 74 98 73 97 71" stroke="#D4956B" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Confident smile */}
        <path d="M90 78 Q100 84 110 78" stroke="#C0604A" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Lips subtle fill */}
        <path d="M92 78 Q100 83 108 78 Q100 80 92 78 Z" fill="#D4706A" opacity="0.3" />

        {/* Face highlight - 3D depth */}
        <ellipse cx="88" cy="58" rx="6" ry="4" fill="rgba(255,255,255,0.08)" />

        {/* Chin shadow */}
        <ellipse cx="100" cy="88" rx="10" ry="4" fill="rgba(0,0,0,0.05)" />

        {/* === SUIT POCKET SQUARE === */}
        <path
          d="M120 120 L124 118 L126 122 L122 124 Z"
          fill="rgba(165,180,252,0.8)"
        />

        {/* Ground shadow */}
        <ellipse cx="100" cy="185" rx="40" ry="8" fill="rgba(0,0,0,0.15)" />
      </svg>
    );
  }

  // Worker variant
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-2xl ${className}`}
    >
      <defs>
        {/* Skin gradients */}
        <linearGradient id="wrk-skin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDDCB5" />
          <stop offset="40%" stopColor="#F5C49A" />
          <stop offset="100%" stopColor="#E8A873" />
        </linearGradient>
        <radialGradient id="wrk-skin-face" cx="45%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FDE8D0" />
          <stop offset="70%" stopColor="#F5C49A" />
          <stop offset="100%" stopColor="#E09960" />
        </radialGradient>

        {/* Hoodie/casual top gradient - modern blue */}
        <linearGradient id="wrk-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="35%" stopColor="#2563EB" />
          <stop offset="70%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="wrk-top-light" x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="wrk-top-dark" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>

        {/* Hair gradient - dark indigo/navy */}
        <linearGradient id="wrk-hair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="50%" stopColor="#15133A" />
          <stop offset="100%" stopColor="#0C0A26" />
        </linearGradient>

        {/* T-shirt under hoodie */}
        <linearGradient id="wrk-inner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Laptop gradients */}
        <linearGradient id="wrk-laptop-base" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6B7280" />
          <stop offset="50%" stopColor="#4B5563" />
          <stop offset="100%" stopColor="#374151" />
        </linearGradient>
        <linearGradient id="wrk-laptop-screen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C7D2FE" />
          <stop offset="40%" stopColor="#A5B4FC" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
        <linearGradient id="wrk-laptop-lid" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#9CA3AF" />
          <stop offset="50%" stopColor="#6B7280" />
          <stop offset="100%" stopColor="#4B5563" />
        </linearGradient>

        {/* Filters */}
        <filter id="wrk-shadow" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="rgba(0,0,0,0.3)" />
        </filter>
        <filter id="wrk-body-shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="3" dy="6" stdDeviation="4" floodColor="rgba(0,0,0,0.25)" />
        </filter>
        <filter id="wrk-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* === BODY / HOODIE === */}
      {/* Main torso */}
      <path
        d="M70 108 C60 108 50 114 46 122 L42 160 C42 166 46 170 52 172 L85 176 L100 178 L115 176 L148 172 C154 170 158 166 158 160 L154 122 C150 114 140 108 130 108 Z"
        fill="url(#wrk-top)"
        filter="url(#wrk-body-shadow)"
      />

      {/* Left shoulder highlight - 3D */}
      <path
        d="M70 108 C60 108 50 114 46 122 L44 145 C50 138 58 116 73 110 Z"
        fill="url(#wrk-top-light)"
        opacity="0.6"
      />

      {/* Right shoulder shadow - 3D depth */}
      <path
        d="M130 108 C140 108 150 114 154 122 L156 145 C150 138 142 116 127 110 Z"
        fill="url(#wrk-top-dark)"
        opacity="0.7"
      />

      {/* Hoodie neckline / collar */}
      <path
        d="M85 108 C85 108 90 116 100 116 C110 116 115 108 115 108"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="2"
        fill="none"
      />

      {/* Inner t-shirt visible at collar */}
      <path
        d="M88 108 L90 118 C90 118 95 122 100 122 C105 122 110 118 110 118 L112 108 Z"
        fill="url(#wrk-inner)"
      />

      {/* Hoodie center line */}
      <path
        d="M100 122 L100 170"
        stroke="rgba(0,0,0,0.1)"
        strokeWidth="1.5"
      />

      {/* Hoodie pocket */}
      <path
        d="M80 148 C80 148 90 152 100 152 C110 152 120 148 120 148 L118 160 C118 162 110 164 100 164 C90 164 82 162 82 160 Z"
        fill="rgba(0,0,0,0.08)"
        stroke="rgba(0,0,0,0.05)"
        strokeWidth="1"
      />

      {/* Shine / glass effect on hoodie */}
      <path
        d="M62 118 C62 118 66 135 64 158"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* === RIGHT ARM (holding laptop) === */}
      <path
        d="M154 122 C160 128 163 136 164 145 L163 162 C163 165 161 166 159 166 L155 164 L154 145 L152 132 Z"
        fill="url(#wrk-top)"
        filter="url(#wrk-shadow)"
      />
      {/* Right hand */}
      <path
        d="M159 160 C161 162 162 165 160 168 C158 170 155 169 154 167 L155 162 C156 160 158 159 159 160 Z"
        fill="url(#wrk-skin)"
      />

      {/* === LAPTOP === */}
      {/* Laptop base/keyboard */}
      <rect x="140" y="155" width="28" height="18" rx="2" fill="url(#wrk-laptop-base)" filter="url(#wrk-shadow)" transform="rotate(5 154 164)" />
      {/* Keyboard area */}
      <rect x="142" y="158" width="24" height="12" rx="1" fill="rgba(50,50,50,0.8)" transform="rotate(5 154 164)" />
      {/* Keyboard keys suggestion */}
      <rect x="144" y="160" width="8" height="1.5" rx="0.5" fill="rgba(255,255,255,0.2)" transform="rotate(5 154 164)" />
      <rect x="154" y="160" width="10" height="1.5" rx="0.5" fill="rgba(255,255,255,0.15)" transform="rotate(5 154 164)" />
      <rect x="144" y="163" width="18" height="1.5" rx="0.5" fill="rgba(255,255,255,0.12)" transform="rotate(5 154 164)" />
      <rect x="144" y="166" width="14" height="1.5" rx="0.5" fill="rgba(255,255,255,0.1)" transform="rotate(5 154 164)" />

      {/* Laptop screen (lid, slightly angled) */}
      <path
        d="M140 155 L140 130 C140 128 141 127 143 127 L168 127 C170 127 171 128 171 130 L171 155 Z"
        fill="url(#wrk-laptop-lid)"
        filter="url(#wrk-shadow)"
        transform="rotate(5 154 150)"
      />
      {/* Screen content */}
      <rect x="142" y="130" width="26" height="22" rx="1" fill="url(#wrk-laptop-screen)" transform="rotate(5 154 150)" />
      {/* Code/content on screen */}
      <rect x="145" y="134" width="14" height="1.5" rx="0.5" fill="rgba(255,255,255,0.6)" transform="rotate(5 154 150)" />
      <rect x="145" y="138" width="10" height="1.5" rx="0.5" fill="rgba(255,255,255,0.5)" transform="rotate(5 154 150)" />
      <rect x="145" y="142" width="16" height="1.5" rx="0.5" fill="rgba(255,255,255,0.4)" transform="rotate(5 154 150)" />
      <rect x="145" y="146" width="8" height="1.5" rx="0.5" fill="rgba(255,255,255,0.35)" transform="rotate(5 154 150)" />
      {/* Screen glow */}
      <rect x="142" y="130" width="26" height="10" rx="1" fill="rgba(255,255,255,0.1)" transform="rotate(5 154 150)" />

      {/* === LEFT ARM === */}
      <path
        d="M46 122 C40 128 37 136 36 145 L37 162 C37 165 39 166 41 166 L45 164 L46 145 L48 130 Z"
        fill="url(#wrk-top)"
        filter="url(#wrk-shadow)"
      />
      {/* Left hand (relaxed at side) */}
      <path
        d="M37 160 C35 162 34 165 36 168 C38 170 41 169 42 167 L42 162 C41 160 39 159 37 160 Z"
        fill="url(#wrk-skin)"
      />

      {/* === NECK === */}
      <path
        d="M90 95 C90 95 92 108 100 108 C108 108 110 95 110 95"
        fill="url(#wrk-skin)"
      />
      <rect x="91" y="92" width="18" height="18" rx="9" fill="url(#wrk-skin)" />

      {/* === HEAD === */}
      {/* Head shape */}
      <ellipse cx="100" cy="64" rx="26" ry="30" fill="url(#wrk-skin-face)" filter="url(#wrk-shadow)" />

      {/* Ear left */}
      <ellipse cx="74" cy="67" rx="5" ry="7" fill="url(#wrk-skin)" />
      <ellipse cx="75" cy="67" rx="3" ry="5" fill="#E8A873" opacity="0.5" />

      {/* Ear right */}
      <ellipse cx="126" cy="67" rx="5" ry="7" fill="url(#wrk-skin)" />
      <ellipse cx="125" cy="67" rx="3" ry="5" fill="#E8A873" opacity="0.5" />

      {/* Hair - modern trendy style */}
      <path
        d="M74 54 C74 32 84 24 100 24 C116 24 126 32 126 54 C126 44 118 32 100 32 C82 32 74 44 74 54 Z"
        fill="url(#wrk-hair)"
      />
      {/* Hair top volume */}
      <path
        d="M78 48 C78 32 88 26 100 25 C112 26 122 32 122 48 C120 38 112 30 100 30 C88 30 80 38 78 48 Z"
        fill="url(#wrk-hair)"
      />
      {/* Hair style - side swept */}
      <path
        d="M76 52 C76 46 78 40 84 36 C80 42 78 48 77 54 Z"
        fill="#1E1B4B"
      />
      {/* Hair highlight */}
      <path
        d="M88 28 C94 26 100 25 106 26 C100 27 94 29 90 33"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="2"
        fill="none"
      />

      {/* === FACE === */}
      {/* Eyebrows - friendly, slightly raised */}
      <path d="M84 54 Q90 51 96 53" stroke="#1E1B4B" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M104 53 Q110 51 116 54" stroke="#1E1B4B" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* Eyes - bright and open */}
      <ellipse cx="90" cy="62" rx="5.5" ry="6" fill="white" />
      <ellipse cx="110" cy="62" rx="5.5" ry="6" fill="white" />
      {/* Iris */}
      <ellipse cx="91" cy="62.5" rx="3.5" ry="4" fill="#312E81" />
      <ellipse cx="111" cy="62.5" rx="3.5" ry="4" fill="#312E81" />
      {/* Pupil */}
      <circle cx="91.5" cy="62" r="1.8" fill="#000" />
      <circle cx="111.5" cy="62" r="1.8" fill="#000" />
      {/* Eye highlights - gives life */}
      <circle cx="89" cy="60" r="2" fill="rgba(255,255,255,0.95)" />
      <circle cx="109" cy="60" r="2" fill="rgba(255,255,255,0.95)" />
      <circle cx="93" cy="64" r="0.8" fill="rgba(255,255,255,0.6)" />
      <circle cx="113" cy="64" r="0.8" fill="rgba(255,255,255,0.6)" />

      {/* Nose */}
      <path d="M98 65 C98 70 100 73 102 73 C100 74 98 73 97 71" stroke="#D4956B" strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* Optimistic wide smile */}
      <path d="M88 78 Q100 87 112 78" stroke="#C0604A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Smile fill - subtle */}
      <path d="M90 79 Q100 86 110 79 Q100 82 90 79 Z" fill="#D4706A" opacity="0.25" />
      {/* Teeth hint */}
      <path d="M93 80 Q100 84 107 80" fill="rgba(255,255,255,0.7)" />

      {/* Cheek blush - friendly look */}
      <ellipse cx="80" cy="74" rx="5" ry="3" fill="rgba(240,128,128,0.15)" />
      <ellipse cx="120" cy="74" rx="5" ry="3" fill="rgba(240,128,128,0.15)" />

      {/* Face highlight - 3D depth */}
      <ellipse cx="88" cy="57" rx="6" ry="4" fill="rgba(255,255,255,0.08)" />

      {/* Ground shadow */}
      <ellipse cx="100" cy="188" rx="42" ry="8" fill="rgba(0,0,0,0.12)" />
    </svg>
  );
};

export default Banner3DCharacter;
