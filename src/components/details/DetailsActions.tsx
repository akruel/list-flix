import { Check, Eye, EyeOff, Plus, Share2 } from "lucide-react";

interface DetailsActionsProps {
  isSaved: boolean;
  watched: boolean;
  onToggleList: () => void;
  onToggleWatched: () => void;
}

export function DetailsActions({
  isSaved,
  watched,
  onToggleList,
  onToggleWatched,
}: DetailsActionsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <button
        data-testid="details-add-button"
        onClick={onToggleList}
        className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-colors ${
          isSaved
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-purple-600 text-white hover:bg-purple-700"
        }`}
      >
        {isSaved ? <Check size={20} /> : <Plus size={20} />}
        {isSaved ? "Salvo" : "Adicionar"}
      </button>
      <button
        data-testid="details-toggle-watched-button"
        onClick={onToggleWatched}
        className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-colors ${
          watched
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-800 text-white hover:bg-gray-700"
        }`}
      >
        {watched ? <Eye size={20} /> : <EyeOff size={20} />}
        {watched ? "Assistido" : "Marcar"}
      </button>
      <button className="flex items-center justify-center gap-2 rounded-xl bg-gray-800 py-3 font-semibold text-white transition-colors hover:bg-gray-700">
        <Share2 size={20} /> Compartilhar
      </button>
    </div>
  );
}
