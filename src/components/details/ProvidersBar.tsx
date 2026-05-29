import { getTmdbImageUrl } from "@/lib/tmdb-images";
import type { Provider } from "@/types";

interface ProvidersBarProps {
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
  link?: string;
}

export function ProvidersBar({ flatrate, rent, buy, link }: ProvidersBarProps) {
  return (
    <div className="h-full rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="mb-4 text-xl font-bold">Onde Assistir</h2>

      {!flatrate.length && !rent.length && !buy.length && (
        <p className="text-sm text-gray-400">
          Nenhuma informação de streaming disponível para o Brasil.
        </p>
      )}

      {flatrate.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Streaming
          </h3>
          <div className="flex flex-wrap gap-3">
            {flatrate.map((provider) => (
              <ProviderLogo key={provider.provider_id} provider={provider} />
            ))}
          </div>
        </div>
      )}

      {rent.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Alugar
          </h3>
          <div className="flex flex-wrap gap-3">
            {rent.map((provider) => (
              <ProviderLogo key={provider.provider_id} provider={provider} />
            ))}
          </div>
        </div>
      )}

      {buy.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Comprar
          </h3>
          <div className="flex flex-wrap gap-3">
            {buy.map((provider) => (
              <ProviderLogo key={provider.provider_id} provider={provider} />
            ))}
          </div>
        </div>
      )}

      {!!link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 block text-center text-xs text-purple-400 hover:text-purple-300"
        >
          Ver todos no TMDB
        </a>
      )}
    </div>
  );
}

function ProviderLogo({ provider }: { provider: Provider }) {
  return (
    <div className="group relative" title={provider.provider_name}>
      <img
        src={getTmdbImageUrl(provider.logo_path, "w300")}
        alt={provider.provider_name}
        className="h-12 w-12 rounded-lg shadow-sm transition-transform group-hover:scale-110"
      />
    </div>
  );
}
