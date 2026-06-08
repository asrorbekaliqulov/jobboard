import React from "react";

export interface ChipOption {
  value: number | string;
  label: string;
}

interface ToggleChipsProps {
  options: ChipOption[];
  selectedIds: (number | string)[];
  onToggle: (id: number | string) => void;
  loading?: boolean;
  accentColor?: string; // e.g. "emerald-600", "blue-600"
  emptyMessage?: string;
}

const ToggleChips: React.FC<ToggleChipsProps> = ({
  options,
  selectedIds,
  onToggle,
  loading = false,
  accentColor = "emerald-600",
  emptyMessage = "No results found",
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <i className="fa-solid fa-spinner animate-spin text-slate-400" />
      </div>
    );
  }

  if (options.length === 0) {
    return <p className="text-sm text-slate-400">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selectedIds
          .map(Number)
          .includes(Number(option.value));
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isSelected
                ? `bg-${accentColor} text-white shadow-lg`
                : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-300"
            }`}
          >
            {option.label}
            {isSelected && <i className="fa-solid fa-check ml-2" />}
          </button>
        );
      })}
    </div>
  );
};

export default ToggleChips;
