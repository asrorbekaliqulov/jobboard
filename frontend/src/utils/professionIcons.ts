/**
 * Auto-detect FontAwesome icon for a profession based on name keywords.
 * Returns a FontAwesome class string and a fallback emoji.
 */

interface IconMatch {
  icon: string;       // FontAwesome icon class (e.g., "fa-laptop-code")
  emoji: string;      // Fallback emoji
  color: string;      // Icon background color
}

// Keyword-to-icon mapping. Order matters — first match wins.
const PROFESSION_ICON_MAP: Array<{ keywords: string[]; icon: string; emoji: string; color: string }> = [
  // IT / Tech
  { keywords: ["it", "программист", "developer", "dasturchi", "frontend", "backend", "fullstack", "devops", "software", "web", "mobile", "react", "python", "java", "php"], icon: "fa-laptop-code", emoji: "\ud83d\udcbb", color: "#6366f1" },
  // Drivers
  { keywords: ["driver", "haydovchi", "водитель", "taxi", "taksi", "yuk", "грузов", "logist", "transport"], icon: "fa-truck", emoji: "\ud83d\ude9b", color: "#f59e0b" },
  // Construction
  { keywords: ["qurilish", "строител", "construction", "builder", "arxitektor", "architect", "инженер", "engineer", "сварщик", "payvandchi"], icon: "fa-helmet-safety", emoji: "\ud83c\udfd7\ufe0f", color: "#ef4444" },
  // Cooks / Food
  { keywords: ["oshpaz", "повар", "cook", "chef", "пекар", "novvoy", "food", "kitchen", "кухн", "barista", "ofitsiant", "официант", "waiter"], icon: "fa-utensils", emoji: "\ud83d\udc68\u200d\ud83c\udf73", color: "#f97316" },
  // Medical / Health
  { keywords: ["vrach", "врач", "doctor", "nurse", "медсестр", "hamshira", "shifokor", "medical", "medits", "фармацевт", "dorixona", "pharmacy", "стоматолог", "tish"], icon: "fa-stethoscope", emoji: "\ud83e\ude7a", color: "#10b981" },
  // Education
  { keywords: ["teacher", "o'qituvchi", "учитель", "преподав", "pedagog", "tutor", "repetitor", "education", "ta'lim", "professor"], icon: "fa-graduation-cap", emoji: "\ud83c\udf93", color: "#8b5cf6" },
  // Trade / Sales
  { keywords: ["sotuvchi", "продавец", "seller", "sales", "savdo", "торгов", "manager", "менеджер", "kassir", "кассир", "cashier", "shop", "magazin", "магазин", "marketing"], icon: "fa-store", emoji: "\ud83c\udfea", color: "#ec4899" },
  // Service / Support
  { keywords: ["xizmat", "сервис", "service", "support", "operator", "call center", "qo'ng'iroq", "receptionist", "administrator", "секретар", "kotib"], icon: "fa-headset", emoji: "\ud83c\udfa7", color: "#06b6d4" },
  // Beauty / Fashion
  { keywords: ["sartarosh", "парикмахер", "barber", "beauty", "go'zallik", "красот", "kosmetolog", "visajist", "stylist", "stilist", "manikur", "массаж", "massaj"], icon: "fa-scissors", emoji: "\u2702\ufe0f", color: "#d946ef" },
  // Security
  { keywords: ["qo'riqchi", "охранник", "security", "guard", "himoya", "безопасност"], icon: "fa-shield-halved", emoji: "\ud83d\udee1\ufe0f", color: "#64748b" },
  // Cleaning
  { keywords: ["tozalash", "уборщ", "cleaner", "cleaning", "farrosh"], icon: "fa-broom", emoji: "\ud83e\uddf9", color: "#14b8a6" },
  // Design / Creative
  { keywords: ["dizayner", "дизайнер", "design", "grafik", "график", "foto", "фото", "photo", "video", "operator", "montaj", "монтаж", "creative"], icon: "fa-palette", emoji: "\ud83c\udfa8", color: "#a855f7" },
  // Finance / Accounting
  { keywords: ["buxgalter", "бухгалтер", "accountant", "finance", "moliya", "финанс", "audit", "bank", "economist", "iqtisodchi"], icon: "fa-calculator", emoji: "\ud83d\udcb0", color: "#059669" },
  // Legal
  { keywords: ["yurist", "юрист", "lawyer", "advokat", "адвокат", "huquq", "legal", "notarius"], icon: "fa-scale-balanced", emoji: "\u2696\ufe0f", color: "#7c3aed" },
  // Textile / Sewing
  { keywords: ["tikuvchi", "швея", "tailor", "sewing", "to'quvchi", "tekstil", "textile", "fashion"], icon: "fa-shirt", emoji: "\ud83e\udea1", color: "#e11d48" },
  // Agriculture
  { keywords: ["dehqon", "фермер", "farmer", "agriculture", "qishloq", "bog'bon", "садовник"], icon: "fa-seedling", emoji: "\ud83c\udf31", color: "#16a34a" },
  // Electric / Plumbing
  { keywords: ["elektrik", "электрик", "electrician", "santexnik", "сантехник", "plumber", "ta'mirchi", "ремонт", "repair", "master", "usta"], icon: "fa-wrench", emoji: "\ud83d\udd27", color: "#0284c7" },
  // Logistics / Warehouse
  { keywords: ["ombor", "склад", "warehouse", "loader", "yukchi", "грузчик", "qadoqchi", "упаковщик", "kuryer", "курьер", "courier", "delivery", "yetkazib"], icon: "fa-boxes-stacked", emoji: "\ud83d\udce6", color: "#ca8a04" },
  // Sports / Fitness
  { keywords: ["sport", "trener", "тренер", "trainer", "fitness", "coach", "gym"], icon: "fa-dumbbell", emoji: "\ud83c\udfcb\ufe0f", color: "#dc2626" },
  // Music / Entertainment
  { keywords: ["muzik", "музык", "music", "artist", "актёр", "aktyor", "tomosha", "event", "tadbir", "ведущий", "boshlovchi"], icon: "fa-music", emoji: "\ud83c\udfb5", color: "#7c3aed" },
];

// Default fallback
const DEFAULT_ICON: IconMatch = { icon: "fa-briefcase", emoji: "\ud83d\udcbc", color: "#6366f1" };

/**
 * Get icon info for a profession based on its name.
 * Checks all available language names to find a match.
 */
export function getProfessionIcon(profession: { name_uz?: string; name_ru?: string; name_en?: string }): IconMatch {
  const searchText = [
    profession.name_uz || "",
    profession.name_ru || "",
    profession.name_en || "",
  ].join(" ").toLowerCase();

  for (const mapping of PROFESSION_ICON_MAP) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword)) {
        return { icon: mapping.icon, emoji: mapping.emoji, color: mapping.color };
      }
    }
  }

  return DEFAULT_ICON;
}

/**
 * Get a unique color for a category index (for consistent visual variety)
 */
const CATEGORY_COLORS = [
  "#6366f1", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#d946ef",
  "#059669", "#0284c7", "#ca8a04", "#7c3aed", "#dc2626",
  "#64748b", "#a855f7", "#16a34a", "#e11d48",
];

export function getCategoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
