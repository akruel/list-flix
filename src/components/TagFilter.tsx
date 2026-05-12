import { Clapperboard, Popcorn, Users } from "lucide-react";

import type { UserListTagType } from "../types";

interface PartnerFilterOption {
  partnerUserId: string;
  displayName: string;
}

interface TagFilterProps {
  activeTags: UserListTagType[];
  onToggle: (tag: UserListTagType) => void;
  counts: Record<UserListTagType, number>;
  partnerOptions?: PartnerFilterOption[];
  activePartnerId?: string | null;
  onPartnerChange?: (partnerId: string | null) => void;
}

const TAG_CONFIG: Record<
  UserListTagType,
  { label: string; icon: typeof Popcorn }
> = {
  noite_de_pipoca: { label: "Noite de Pipoca", icon: Popcorn },
  fim_de_semana: { label: "Fim de Semana", icon: Clapperboard },
  assistir_com: { label: "Assistir com", icon: Users },
};

export function TagFilter({
  activeTags,
  onToggle,
  counts,
  partnerOptions = [],
  activePartnerId,
  onPartnerChange,
}: TagFilterProps) {
  const tags = Object.entries(TAG_CONFIG) as [
    UserListTagType,
    (typeof TAG_CONFIG)[UserListTagType],
  ][];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map(([tag, config]) => {
        const Icon = config.icon;
        const isActive = activeTags.includes(tag);

        return (
          <button
            key={tag}
            data-testid={`tag-filter-${tag}`}
            onClick={() => onToggle(tag)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors md:px-4 md:text-sm ${
              isActive
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <Icon size={16} />
            {config.label} ({counts[tag] || 0})
          </button>
        );
      })}

      {partnerOptions.length > 0 && (
        <div className="flex items-center gap-2">
          <Users
            size={16}
            className={activePartnerId ? "text-purple-400" : "text-gray-500"}
          />
          <select
            data-testid="tag-filter-partner"
            value={activePartnerId ?? ""}
            onChange={(e) => onPartnerChange?.(e.target.value || null)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 md:text-sm"
          >
            <option value="">Assistir com…</option>
            {partnerOptions.map((p) => (
              <option key={p.partnerUserId} value={p.partnerUserId}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
