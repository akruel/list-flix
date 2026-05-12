import { Check } from "lucide-react";

import type { UserListTagType } from "../types";

interface TagSelectorProps {
  selectedTags: UserListTagType[];
  onToggle: (tag: UserListTagType) => void;
  availableTags?: UserListTagType[];
}

const TAG_OPTIONS: {
  value: UserListTagType;
  label: string;
  description: string;
}[] = [
  {
    value: "noite_de_pipoca",
    label: "Noite de Pipoca",
    description: "Filmes leves e divertidos",
  },
  {
    value: "fim_de_semana",
    label: "Fim de Semana",
    description: "Maratona ou binge-watch",
  },
];

export function TagSelector({
  selectedTags,
  onToggle,
  availableTags,
}: TagSelectorProps) {
  const options = availableTags
    ? TAG_OPTIONS.filter((o) => availableTags.includes(o.value))
    : TAG_OPTIONS;

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-400">Tags (opcional)</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedTags.includes(option.value);

          return (
            <button
              key={option.value}
              data-testid={`tag-selector-${option.value}`}
              onClick={() => onToggle(option.value)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors md:px-4 md:text-sm ${
                isSelected
                  ? "border-purple-500 bg-purple-600/20 text-purple-400"
                  : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
              }`}
            >
              {isSelected ? (
                <Check size={14} className="text-purple-400" />
              ) : null}
              <div className="text-left">
                <span className="block">{option.label}</span>
                <span className="block text-xs text-gray-500">
                  {option.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
