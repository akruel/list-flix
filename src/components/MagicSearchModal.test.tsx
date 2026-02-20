import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MagicSearchModal } from './MagicSearchModal'

const mocks = vi.hoisted(() => ({
  getSuggestions: vi.fn(),
  search: vi.fn(),
  discover: vi.fn(),
  searchPerson: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('../services/ai', () => ({
  ai: {
    getSuggestions: (...args: unknown[]) => mocks.getSuggestions(...args),
  },
}))

vi.mock('../services/tmdb', () => ({
  tmdb: {
    search: (...args: unknown[]) => mocks.search(...args),
    discover: (...args: unknown[]) => mocks.discover(...args),
    searchPerson: (...args: unknown[]) => mocks.searchPerson(...args),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mocks.toastSuccess(...args),
    error: (...args: unknown[]) => mocks.toastError(...args),
  },
}))

vi.mock('./MovieCard', () => ({
  MovieCard: ({ item }: { item: { id: number; title?: string; name?: string } }) => (
    <div data-testid="magic-item">{item.title ?? item.name ?? item.id}</div>
  ),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    onOpenChange,
  }: {
    children: ReactNode
    onOpenChange: (open: boolean) => void
  }) => (
    <div>
      <button type="button" onClick={() => onOpenChange(false)}>
        close-dialog
      </button>
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

describe('MagicSearchModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.search.mockResolvedValue([{ id: 1, media_type: 'movie', title: 'Movie A' }])
    mocks.discover.mockResolvedValue([{ id: 2, media_type: 'movie', title: 'Movie B' }])
    mocks.searchPerson.mockResolvedValue(123)
    mocks.getSuggestions.mockResolvedValue({
      strategy: 'search',
      query: 'Matrix',
      suggested_list_name: 'Sci-Fi',
    })
  })

  async function openAndTypePrompt(prompt = 'filmes de ficção') {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />)
    await userEvent.type(
      screen.getByPlaceholderText('Ex: Filmes de suspense para assistir no final de semana...'),
      prompt,
    )
    await userEvent.click(screen.getByRole('button', { name: /Sugerir/i }))
  }

  it('does not submit when prompt is empty', async () => {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Sugerir/i })).toBeDisabled()
    expect(mocks.getSuggestions).not.toHaveBeenCalled()
  })

  it('returns early when submitting whitespace-only prompt', async () => {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />)

    await userEvent.type(
      screen.getByPlaceholderText('Ex: Filmes de suspense para assistir no final de semana...'),
      '   ',
    )

    fireEvent.submit(screen.getByRole('button', { name: /Sugerir/i }).closest('form') as HTMLFormElement)

    expect(mocks.getSuggestions).not.toHaveBeenCalled()
  })

  it.each([
    {
      caseName: 'search strategy',
      filters: { strategy: 'search', query: 'Matrix', suggested_list_name: 'Matrix list' },
      assertCalls: () => {
        expect(mocks.search).toHaveBeenCalledWith('Matrix')
      },
    },
    {
      caseName: 'discover strategy',
      filters: { strategy: 'discover', with_genres: '28', suggested_list_name: 'Action list' },
      assertCalls: () => {
        expect(mocks.discover).toHaveBeenCalledWith(
          expect.objectContaining({ strategy: 'discover', with_genres: '28' }),
        )
      },
    },
    {
      caseName: 'person strategy with cast role',
      filters: {
        strategy: 'person',
        person_name: 'Tom Cruise',
        role: 'cast',
        suggested_list_name: 'Tom',
      },
      assertCalls: () => {
        expect(mocks.searchPerson).toHaveBeenCalledWith('Tom Cruise')
        expect(mocks.discover).toHaveBeenCalledWith(
          expect.objectContaining({ with_cast: 123 }),
        )
      },
    },
    {
      caseName: 'person strategy with crew role',
      filters: {
        strategy: 'person',
        person_name: 'Nolan',
        role: 'crew',
        suggested_list_name: 'Nolan',
      },
      assertCalls: () => {
        expect(mocks.searchPerson).toHaveBeenCalledWith('Nolan')
        expect(mocks.discover).toHaveBeenCalledWith(
          expect.objectContaining({ with_crew: 123 }),
        )
      },
    },
  ])('handles $caseName', async ({ filters, assertCalls }) => {
    mocks.getSuggestions.mockResolvedValue(filters)

    await openAndTypePrompt()

    await waitFor(() => {
      assertCalls()
    })
    expect(await screen.findByTestId('magic-item')).toBeInTheDocument()
  })

  it('uses default suggested name when AI response omits suggested_list_name', async () => {
    mocks.getSuggestions.mockResolvedValue({
      strategy: 'discover',
      with_genres: '28',
    })

    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />)

    await userEvent.type(
      screen.getByPlaceholderText('Ex: Filmes de suspense para assistir no final de semana...'),
      'ação',
    )
    await userEvent.click(screen.getByRole('button', { name: /Sugerir/i }))

    expect(await screen.findByDisplayValue('Lista Sugerida')).toBeInTheDocument()
  })

  it('shows toast error when person is not found', async () => {
    mocks.getSuggestions.mockResolvedValue({
      strategy: 'person',
      person_name: 'Unknown',
      role: 'cast',
      suggested_list_name: 'Unknown',
    })
    mocks.searchPerson.mockResolvedValue(null)

    await openAndTypePrompt()

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Pessoa não encontrada. Tente outro nome.')
    })
  })

  it('shows toast error when suggestion generation fails', async () => {
    mocks.getSuggestions.mockRejectedValue(new Error('ai failed'))

    await openAndTypePrompt()

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Erro ao gerar sugestões. Tente novamente.')
    })
  })

  it.each([
    {
      caseName: 'save success',
      onSaveList: vi.fn().mockResolvedValue(undefined),
      shouldSuccess: true,
      shouldError: false,
    },
    {
      caseName: 'save failure',
      onSaveList: vi.fn().mockRejectedValue(new Error('save failed')),
      shouldSuccess: false,
      shouldError: true,
    },
  ])('handles $caseName', async ({ onSaveList, shouldSuccess, shouldError }) => {
    mocks.getSuggestions.mockResolvedValue({
      strategy: 'search',
      query: 'Matrix',
      suggested_list_name: 'Sci-Fi',
    })
    const onClose = vi.fn()

    render(<MagicSearchModal isOpen onClose={onClose} onSaveList={onSaveList} />)

    await userEvent.type(
      screen.getByPlaceholderText('Ex: Filmes de suspense para assistir no final de semana...'),
      'matrix',
    )
    await userEvent.click(screen.getByRole('button', { name: /Sugerir/i }))
    await screen.findByTestId('magic-item')

    await userEvent.click(screen.getByRole('button', { name: /Salvar Lista/i }))

    await waitFor(() => {
      expect(onSaveList).toHaveBeenCalledWith('Sci-Fi', expect.any(Array))
    })

    if (shouldSuccess) {
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Lista criada com sucesso!')
      expect(onClose).toHaveBeenCalled()
    }
    if (shouldError) {
      expect(mocks.toastError).toHaveBeenCalledWith('Erro ao salvar a lista.')
    }
  })

  it('validates list name before saving', async () => {
    mocks.getSuggestions.mockResolvedValue({
      strategy: 'search',
      query: 'Matrix',
      suggested_list_name: 'Sci-Fi',
    })

    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />)

    await userEvent.type(
      screen.getByPlaceholderText('Ex: Filmes de suspense para assistir no final de semana...'),
      'matrix',
    )
    await userEvent.click(screen.getByRole('button', { name: /Sugerir/i }))
    await screen.findByTestId('magic-item')

    const nameInput = screen.getByDisplayValue('Sci-Fi')
    await userEvent.clear(nameInput)
    await userEvent.click(screen.getByRole('button', { name: /Salvar Lista/i }))

    expect(mocks.toastError).toHaveBeenCalledWith('Por favor, dê um nome para a lista.')
  })

  it('resets modal state when closed', async () => {
    const onClose = vi.fn()
    render(<MagicSearchModal isOpen onClose={onClose} onSaveList={vi.fn()} />)

    await userEvent.type(
      screen.getByPlaceholderText('Ex: Filmes de suspense para assistir no final de semana...'),
      'matrix',
    )
    await userEvent.click(screen.getByRole('button', { name: 'close-dialog' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
