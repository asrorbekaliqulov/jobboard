import React, { useState } from "react";

// 3D rendered icons from icons8 Fluency 3D set (loaded via CDN at runtime)
const ICON_BASE = "https://img.icons8.com/3d-fluency/94";

export const ICON_3D = {
  // Stats
  workers: "conference-call",
  employers: "briefcase",
  vacancies: "car",
  time: "alarm-clock",
  // Quick actions
  rocket: "rocket",
  target: "target",
  fire: "fire-element",
  bookmark: "bookmark-ribbon",
  // Categories
  masters: "worker-male",
  drivers: "truck",
  construction: "crane",
  it: "laptop",
  trade: "shop",
  service: "headset",
  cooks: "chef-hat",
  other: "menu",
  // Misc
  businessman: "businessman",
  user: "user-male-circle",
  briefcase: "briefcase",
  bell: "bell",
} as const;

export type Icon3DName = keyof typeof ICON_3D;

interface Icon3DProps {
  name: Icon3DName;
  size?: number;
  className?: string;
  fallbackEmoji?: string;
}

const Icon3D: React.FC<Icon3DProps> = ({ name, size = 48, className = "", fallbackEmoji }) => {
  const [errored, setErrored] = useState(false);
  const slug = ICON_3D[name];

  if (errored && fallbackEmoji) {
    return (
      <span className={`select-none ${className}`} style={{ fontSize: size * 0.7, lineHeight: 1 }}>
        {fallbackEmoji}
      </span>
    );
  }

  return (
    <img
      src={`${ICON_BASE}/${slug}.png`}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErrored(true)}
      className={`select-none object-contain ${className}`}
      style={{ width: size, height: size, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.12))" }}
    />
  );
};

export default Icon3D;
