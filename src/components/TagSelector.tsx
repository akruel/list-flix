import { Check, Users } from "lucide-react";

import type { UserListTagType } from "../types";

interface PartnerOption {
  partnerUserId: string;
  displayName: string;
}

interface TagSelectorProps {
  selectedTags: UserListTagType[];
  onToggle: (tag: UserListTagType) => void;
  availableTags?: UserListTagType[];
  partnerOptions?: PartnerOption[];
  selectedPartnerId?: string;
  onPartnerChange?: (partnerId: string | undefined) => void;
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
  {
    value: "assistir_com",
    label: "Assistir com",
    description: "Compartilhar com um parceiro",
  },
];

export function TagSelector({
  selectedTags,
  onToggle,
  availableTags,
  partnerOptions = [],
  selectedPartnerId,
  onPartnerChange,
}: TagSelectorProps) {
  const options = availableTags
    ? TAG_OPTIONS.filter((o) => availableTags.includes(o.value))
    : TAG_OPTIONS;
  const hasAssistirCom = selectedTags.includes("assistir_com");

  const handleToggle = (tag: UserListTagType) => {
    if (tag === "assistir_com" && hasAssistirCom && onPartnerChange) {
      onPartnerChange(undefined);
    }
    onToggle(tag);
  };

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
              onClick={() => handleToggle(option.value)}
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

      {hasAssistirCom && partnerOptions.length > 0 ? (
        <div className="flex items-center gap-2">
          <Users size={14} className="text-gray-500" />
          <select
            data-testid="tag-selector-partner"
            value={selectedPartnerId ?? ""}
            onChange={(e) => onPartnerChange?.(e.target.value || undefined)}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-200"
          >
            <option value="">Selecione um parceiro</option>
            {partnerOptions.map((p) => (
              <option key={p.partnerUserId} value={p.partnerUserId}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
