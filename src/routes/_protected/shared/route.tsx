import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { MovieCard } from '@/components/MovieCard'
import { ContentGridSkeleton } from '@/components/skeletons'
import { supabaseService } from '@/services/supabase'
import { tmdb } from '@/services/tmdb'
import type { ContentItem } from '@/types'

type SharedRouteSearch = {
  id?: string
  data?: string
}

export const Route = createFileRoute('/_protected/shared')({
  validateSearch: (search: Record<string, unknown>): SharedRouteSearch => ({
    id: typeof search.id === 'string' ? search.id : undefined,
    data: typeof search.data === 'string' ? search.data : undefined,
  }),
  component: SharedRouteComponent,
})

function SharedRouteComponent() {
  const { id, data } = Route.useSearch()

  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSharedItems = async () => {
      if (!data && !id) {
        setError('Link inválido ou incompleto.')
        setLoading(false)
        return
      }

      try {
        let listData: { id: number; type: 'movie' | 'tv' }[] = []

        if (id) {
          listData = await supabaseService.getSharedList(id)
        } else if (data) {
          const decoded = atob(data)
          listData = JSON.parse(decoded)
        }

        const promises = listData.map((item) => tmdb.getDetails(item.id, item.type))
        const results = await Promise.all(promises)

        setItems(results)
      } catch (err) {
        console.error('Error loading shared list:', err)
        setError('Erro ao carregar a lista compartilhada.')
      } finally {
        setLoading(false)
      }
    }

    void fetchSharedItems()
  }, [data, id])

  if (loading) {
    return (
      <div data-testid="route-shared">
        <h1 className="text-3xl font-bold mb-6">Lista Compartilhada</h1>
        <ContentGridSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid="route-shared" className="text-center py-20 text-red-400">
        <p className="text-xl">{error}</p>
      </div>
    )
  }

  return (
    <div data-testid="route-shared">
      <h1 className="text-3xl font-bold mb-6">Lista Compartilhada</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <MovieCard key={item.id} item={item} showProgress={true} />
        ))}
      </div>
    </div>
  )
}
