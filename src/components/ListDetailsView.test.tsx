import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useStore } from '../store/useStore'
import { ListDetailsView } from './ListDetailsView'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  updateList: vi.fn(),
  getListDetails: vi.fn(),
  removeListItem: vi.fn(),
  deleteList: vi.fn(),
  removeListMember: vi.fn(),
  getShareUrl: vi.fn(() => 'https://listflix.local/lists/list-1/join?role=viewer'),
  tmdbGetDetails: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('../store/useStore', () => ({
  useStore: vi.fn(),
}))

vi.mock('../services/listService', () => ({
  listService: {
    getListDetails: mocks.getListDetails,
    removeListItem: mocks.removeListItem,
    deleteList: mocks.deleteList,
    removeListMember: mocks.removeListMember,
    getShareUrl: mocks.getShareUrl,
  },
}))

vi.mock('../services/tmdb', () => ({
  tmdb: {
    getDetails: mocks.tmdbGetDetails,
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

vi.mock('./MovieCard', () => ({
  MovieCard: ({ item }: { item: { title?: string; name?: string } }) => (
    <div data-testid="movie-card">{item.title || item.name || 'no title'}</div>
  ),
}))

vi.mock('./DeleteConfirmationModal', () => ({
  DeleteConfirmationModal: ({
    isOpen,
    title,
    onConfirm,
  }: {
    isOpen: boolean
    title: string
    onConfirm: () => void
  }) =>
    isOpen ? (
      <div data-testid={`modal-${title}`}>
        <p>{title}</p>
        <button onClick={onConfirm} type="button">
          Confirmar exclusao
        </button>
      </div>
    ) : null,
}))

const mockedUseStore = vi.mocked(useStore)
let consoleErrorSpy: ReturnType<typeof vi.spyOn>

function createListDetails(overrides?: {
  role?: 'owner' | 'editor' | 'viewer'
  items?: Array<{
    id: string
    list_id: string
    content_id: number
    content_type: 'movie' | 'tv'
    added_by: string
    created_at: string
  }>
  members?: Array<{
    list_id: string
    user_id: string
    role: 'owner' | 'editor' | 'viewer'
    member_name?: string
    created_at: string
  }>
}) {
  return {
    list: {
      id: 'list-1',
      name: 'Minha Lista',
      owner_id: 'owner-1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      role: overrides?.role ?? 'owner',
    },
    items:
      overrides?.items ??
      [
        {
          id: 'item-1',
          list_id: 'list-1',
          content_id: 100,
          content_type: 'movie' as const,
          added_by: 'owner-1',
          created_at: '2026-01-01',
        },
      ],
    members:
      overrides?.members ??
      [
        {
          list_id: 'list-1',
          user_id: 'owner-1',
          role: 'owner' as const,
          member_name: 'Owner',
          created_at: '2026-01-01',
        },
        {
          list_id: 'list-1',
          user_id: 'viewer-1',
          role: 'viewer' as const,
          member_name: 'Bob',
          created_at: '2026-01-01',
        },
      ],
  }
}

describe('ListDetailsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedUseStore.mockReturnValue({ updateList: mocks.updateList } as unknown as ReturnType<typeof useStore>)
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('shows loading skeleton while list details are pending', () => {
    mocks.getListDetails.mockImplementation(() => new Promise(() => {}))

    const { container } = render(<ListDetailsView id="list-1" />)

    expect(container.querySelector('.space-y-8.animate-in')).not.toBeNull()
  })

  it('renders fallback error state when loading fails', async () => {
    mocks.getListDetails.mockRejectedValue(new Error('failed'))

    render(<ListDetailsView id="list-1" />)

    expect(await screen.findByText('Failed to load list')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Voltar para minhas listas' }))

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/lists' })
  })

  it('allows owner to edit, save and cancel list name changes', async () => {
    mocks.getListDetails.mockResolvedValue(createListDetails({ items: [] }))
    mocks.updateList.mockResolvedValue(undefined)

    render(<ListDetailsView id="list-1" />)

    expect(await screen.findByText('Minha Lista')).toBeInTheDocument()

    await userEvent.click(screen.getByTitle('Editar nome'))

    const input = screen.getByDisplayValue('Minha Lista')
    await userEvent.clear(input)
    await userEvent.type(input, 'Nova Lista')
    await userEvent.click(screen.getByRole('button', { name: /Salvar/i }))

    await waitFor(() => {
      expect(mocks.updateList).toHaveBeenCalledWith('list-1', 'Nova Lista')
    })

    expect(mocks.toastSuccess).toHaveBeenCalledWith('Nome da lista atualizado')
    expect(await screen.findByText('Nova Lista')).toBeInTheDocument()

    await userEvent.click(screen.getByTitle('Editar nome'))
    await userEvent.click(screen.getByRole('button', { name: /Cancelar/i }))

    expect(screen.queryByDisplayValue('Nova Lista')).not.toBeInTheDocument()
  })

  it('removes list item after confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    mocks.getListDetails.mockResolvedValue(createListDetails())
    mocks.tmdbGetDetails.mockResolvedValue({
      id: 100,
      media_type: 'movie',
      title: 'Movie One',
    })
    mocks.removeListItem.mockResolvedValue(undefined)

    render(<ListDetailsView id="list-1" />)

    expect(await screen.findByText('Movie One')).toBeInTheDocument()

    await userEvent.click(screen.getByTitle('Remover item'))

    await waitFor(() => {
      expect(mocks.removeListItem).toHaveBeenCalledWith('item-1')
    })

    expect(screen.queryByText('Movie One')).not.toBeInTheDocument()
  })

  it('removes non-owner member after confirmation', async () => {
    mocks.getListDetails.mockResolvedValue(createListDetails({ items: [] }))
    mocks.removeListMember.mockResolvedValue(undefined)

    render(<ListDetailsView id="list-1" />)

    expect(await screen.findByText('Bob')).toBeInTheDocument()

    await userEvent.click(screen.getByTitle('Remover membro'))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusao' }))

    await waitFor(() => {
      expect(mocks.removeListMember).toHaveBeenCalledWith('list-1', 'viewer-1')
    })

    expect(mocks.toastSuccess).toHaveBeenCalledWith('Membro removido com sucesso')
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })
})
