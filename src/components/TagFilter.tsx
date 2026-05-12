import { Clapperboard, Popcorn } from "lucide-react";

import type { UserListTagType } from "../types";

interface TagFilterProps {
  activeTags: UserListTagType[];
  onToggle: (tag: UserListTagType) => void;
  counts: Record<UserListTagType, number>;
}

const TAG_CONFIG: Record<
  UserListTagType,
  { label: string; icon: typeof Popcorn }
> = {
  noite_de_pipoca: { label: "Noite de Pipoca", icon: Popcorn },
  fim_de_semana: { label: "Fim de Semana", icon: Clapperboard },
};

export function TagFilter({ activeTags, onToggle, counts }: TagFilterProps) {
  const tags = Object.entries(TAG_CONFIG) as [
    UserListTagType,
    (typeof TAG_CONFIG)[UserListTagType],
  ][];

  return (
    <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
