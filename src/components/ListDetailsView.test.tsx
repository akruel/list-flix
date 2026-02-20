import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
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

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode
    onClick?: () => void
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
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
    onClose,
    description,
    isDeleting,
  }: {
    isOpen: boolean
    title: string
    onConfirm: () => void
    onClose: () => void
    description: string
    isDeleting?: boolean
  }) =>
    isOpen ? (
      <div data-testid={`modal-${title}`}>
        <p>{title}</p>
        <p>{description}</p>
        {isDeleting ? <p>deleting</p> : null}
        <button onClick={onConfirm} type="button">
          Confirmar exclusao
        </button>
        <button onClick={onClose} type="button">
          Fechar modal
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
    Object.defineProperty(window.navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    })
    mockedUseStore.mockReturnValue({ updateList: mocks.updateList } as unknown as ReturnType<typeof useStore>)
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    vi.unstubAllGlobals()
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

  it.each([
    { caseName: 'owner can remove members', role: 'owner' as const, canRemoveMember: true },
    { caseName: 'editor cannot remove members', role: 'editor' as const, canRemoveMember: false },
    { caseName: 'viewer cannot remove members', role: 'viewer' as const, canRemoveMember: false },
  ])('applies member permissions for $caseName', async ({ role, canRemoveMember }) => {
    mocks.getListDetails.mockResolvedValue(createListDetails({ role, items: [] }))

    render(<ListDetailsView id="list-1" />)

    await screen.findByText('Minha Lista')

    if (canRemoveMember) {
      expect(screen.getByTitle('Remover membro')).toBeInTheDocument()
    } else {
      expect(screen.queryByTitle('Remover membro')).not.toBeInTheDocument()
    }
  })

  it.each([
    { caseName: 'owner can edit items', role: 'owner' as const, canEdit: true },
    { caseName: 'editor can edit items', role: 'editor' as const, canEdit: true },
    { caseName: 'viewer cannot edit items', role: 'viewer' as const, canEdit: false },
  ])('applies item edit permissions for $caseName', async ({ role, canEdit }) => {
    mocks.getListDetails.mockResolvedValue(createListDetails({ role }))
    mocks.tmdbGetDetails.mockResolvedValue({
      id: 100,
      media_type: 'movie',
      title: 'Movie One',
    })

    render(<ListDetailsView id="list-1" />)

    await screen.findByText('Movie One')

    if (canEdit) {
      expect(screen.getByTitle('Remover item')).toBeInTheDocument()
    } else {
      expect(screen.queryByTitle('Remover item')).not.toBeInTheDocument()
    }
  })

  it('does not load list when id is empty', () => {
    const { container } = render(<ListDetailsView id="" />)

    expect(mocks.getListDetails).not.toHaveBeenCalled()
    expect(container.querySelector('.space-y-8.animate-in')).not.toBeNull()
  })

  it('renders list not found state when list payload is null', async () => {
    mocks.getListDetails.mockResolvedValue({
      list: null,
      items: [],
      members: [],
    })

    render(<ListDetailsView id="list-1" />)

    expect(await screen.findByText('List not found')).toBeInTheDocument()
  })

  it('shows unavailable content card when TMDB details fail', async () => {
    mocks.getListDetails.mockResolvedValue(createListDetails())
    mocks.tmdbGetDetails.mockRejectedValue(new Error('tmdb failed'))

    render(<ListDetailsView id="list-1" />)

    expect(await screen.findByText('Conteúdo indisponível')).toBeInTheDocument()
  })

  it('navigates back from header back button', async () => {
    mocks.getListDetails.mockResolvedValue(createListDetails({ items: [] }))

    render(<ListDetailsView id="list-1" />)

    await screen.findByText('Minha Lista')
    await userEvent.click(screen.getByTitle('Voltar'))

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/lists' })
  })

  it.each([
    { caseName: 'editor share', role: 'editor' as const },
    { caseName: 'viewer share', role: 'viewer' as const },
  ])('copies share URL for $caseName', async ({ role }) => {
    mocks.getListDetails.mockResolvedValue(createListDetails({ items: [] }))
    mocks.getShareUrl.mockImplementation((_listId: string, shareRole: 'editor' | 'viewer') => {
      return `https://listflix.local/lists/list-1/join?role=${shareRole}`
    })

    render(<ListDetailsView id="list-1" />)

    await screen.findByText('Minha Lista')
    await userEvent.click(
      screen.getByRole('button', {
        name: role === 'editor' ? /Compartilhar como Editor/i : /Compartilhar como Visualizador/i,
      }),
    )

    expect(mocks.getShareUrl).toHaveBeenCalledWith('list-1', role)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `https://listflix.local/lists/list-1/join?role=${role}`,
    )
    expect(screen.getByRole('button', { name: /Copiado!/i })).toBeInTheDocument()
  })

  it.each([
    {
      caseName: 'cancelled confirmation',
      confirmValue: false,
      removeError: null,
      shouldCallRemove: false,
      expectedToastError: false,
    },
    {
      caseName: 'remove item failure',
      confirmValue: true,
      removeError: new Error('remove failed'),
      shouldCallRemove: true,
      expectedToastError: true,
    },
  ])(
    'handles remove item flow for $caseName',
    async ({ confirmValue, removeError, shouldCallRemove, expectedToastError }) => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(confirmValue))
      mocks.getListDetails.mockResolvedValue(createListDetails())
      mocks.tmdbGetDetails.mockResolvedValue({
        id: 100,
        media_type: 'movie',
        title: 'Movie One',
      })
      mocks.removeListItem.mockImplementation(() =>
        removeError ? Promise.reject(removeError) : Promise.resolve(undefined),
      )

      render(<ListDetailsView id="list-1" />)

      await screen.findByText('Movie One')
      await userEvent.click(screen.getByTitle('Remover item'))

      if (shouldCallRemove) {
        await waitFor(() => {
          expect(mocks.removeListItem).toHaveBeenCalledWith('item-1')
        })
      } else {
        expect(mocks.removeListItem).not.toHaveBeenCalled()
      }

      if (expectedToastError) {
        expect(mocks.toastError).toHaveBeenCalledWith('Falha ao remover item')
      }
    },
  )

  it.each([
    { caseName: 'save by Enter key', key: 'Enter', shouldUpdate: true },
    { caseName: 'cancel by Escape key', key: 'Escape', shouldUpdate: false },
  ])('handles keyboard edit flow for $caseName', async ({ key, shouldUpdate }) => {
    mocks.getListDetails.mockResolvedValue(createListDetails({ items: [] }))
    mocks.updateList.mockResolvedValue(undefined)

    render(<ListDetailsView id="list-1" />)

    await screen.findByText('Minha Lista')
    await userEvent.click(screen.getByTitle('Editar nome'))

    const input = screen.getByDisplayValue('Minha Lista')
    await userEvent.clear(input)
    await userEvent.type(input, 'Nome via teclado')
    await userEvent.keyboard(`{${key}}`)

    if (shouldUpdate) {
      await waitFor(() => {
        expect(mocks.updateList).toHaveBeenCalledWith('list-1', 'Nome via teclado')
      })
    } else {
      expect(mocks.updateList).not.toHaveBeenCalled()
      expect(screen.queryByDisplayValue('Nome via teclado')).not.toBeInTheDocument()
    }
  })

  it.each([
    {
      caseName: 'blank edited name',
      name: '   ',
      updateError: null,
      expectUpdateCall: false,
      expectedToastError: false,
    },
    {
      caseName: 'update failure',
      name: 'Nome com erro',
      updateError: new Error('update failed'),
      expectUpdateCall: true,
      expectedToastError: true,
    },
  ])('handles save editing edge case: $caseName', async ({ name, updateError, expectUpdateCall, expectedToastError }) => {
    mocks.getListDetails.mockResolvedValue(createListDetails({ items: [] }))
    mocks.updateList.mockImplementation(() =>
      updateError ? Promise.reject(updateError) : Promise.resolve(undefined),
    )

    render(<ListDetailsView id="list-1" />)

    await screen.findByText('Minha Lista')
    await userEvent.click(screen.getByTitle('Editar nome'))

    const input = screen.getByDisplayValue('Minha Lista')
    await userEvent.clear(input)
    await userEvent.type(input, name)
    await userEvent.click(screen.getByRole('button', { name: /Salvar/i }))

    if (expectUpdateCall) {
      await waitFor(() => {
        expect(mocks.updateList).toHaveBeenCalled()
      })
    } else {
      expect(mocks.updateList).not.toHaveBeenCalled()
    }

    if (expectedToastError) {
      expect(mocks.toastError).toHaveBeenCalledWith('Erro ao atualizar nome da lista')
    }
  })

  it.each([
    {
      caseName: 'delete success',
      deleteError: null,
      shouldNavigate: true,
      expectedToast: 'Lista excluída com sucesso',
    },
    {
      caseName: 'delete failure',
      deleteError: new Error('delete failed'),
      shouldNavigate: false,
      expectedToast: 'Erro ao excluir lista',
    },
  ])('handles delete modal flow for $caseName', async ({ deleteError, shouldNavigate, expectedToast }) => {
    mocks.getListDetails.mockResolvedValue(createListDetails({ items: [] }))
    mocks.deleteList.mockImplementation(() =>
      deleteError ? Promise.reject(deleteError) : Promise.resolve(undefined),
    )

    render(<ListDetailsView id="list-1" />)

    await screen.findByText('Minha Lista')
    await userEvent.click(screen.getByRole('button', { name: /Excluir/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusao' }))

    await waitFor(() => {
      expect(mocks.deleteList).toHaveBeenCalledWith('list-1')
    })

    if (shouldNavigate) {
      expect(mocks.toastSuccess).toHaveBeenCalledWith(expectedToast)
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/lists' })
    } else {
      expect(mocks.toastError).toHaveBeenCalledWith(expectedToast)
      expect(mocks.navigate).not.toHaveBeenCalled()
    }
  })

  it('closes delete-list modal without confirming', async () => {
    mocks.getListDetails.mockResolvedValue(createListDetails({ items: [] }))
    mocks.deleteList.mockResolvedValue(undefined)

    render(<ListDetailsView id="list-1" />)

    await screen.findByText('Minha Lista')
    await userEvent.click(screen.getByRole('button', { name: /Excluir/i }))
    expect(screen.getByTestId('modal-Excluir Lista')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Fechar modal' }))

    await waitFor(() => {
      expect(screen.queryByTestId('modal-Excluir Lista')).not.toBeInTheDocument()
    })
    expect(mocks.deleteList).not.toHaveBeenCalled()
  })

  it('shows remove-member error when member deletion fails', async () => {
    mocks.getListDetails.mockResolvedValue(createListDetails({ items: [] }))
    mocks.removeListMember.mockRejectedValue(new Error('remove member failed'))

    render(<ListDetailsView id="list-1" />)

    await screen.findByText('Bob')
    await userEvent.click(screen.getByTitle('Remover membro'))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusao' }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Falha ao remover membro')
    })
  })

  it('keeps member modal open when close is clicked during removal', async () => {
    let resolveRemoval: (() => void) | null = null
    const pendingRemoval = new Promise<void>((resolve) => {
      resolveRemoval = resolve
    })

    mocks.getListDetails.mockResolvedValue(createListDetails({ items: [] }))
    mocks.removeListMember.mockReturnValue(pendingRemoval)

    render(<ListDetailsView id="list-1" />)

    await screen.findByText('Bob')
    await userEvent.click(screen.getByTitle('Remover membro'))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusao' }))

    expect(await screen.findByText('deleting')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Fechar modal' }))
    expect(screen.getByTestId('modal-Remover membro')).toBeInTheDocument()

    resolveRemoval?.()

    await waitFor(() => {
      expect(screen.queryByTestId('modal-Remover membro')).not.toBeInTheDocument()
    })
  })

  it('closes member modal when not removing', async () => {
    mocks.getListDetails.mockResolvedValue(createListDetails({ items: [] }))
    mocks.removeListMember.mockResolvedValue(undefined)

    render(<ListDetailsView id="list-1" />)

    await screen.findByText('Bob')
    await userEvent.click(screen.getByTitle('Remover membro'))
    expect(screen.getByTestId('modal-Remover membro')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Fechar modal' }))

    await waitFor(() => {
      expect(screen.queryByTestId('modal-Remover membro')).not.toBeInTheDocument()
    })
  })

  it('renders member role badges for owner editor and viewer with name fallback', async () => {
    mocks.getListDetails.mockResolvedValue(
      createListDetails({
        items: [],
        members: [
          {
            list_id: 'list-1',
            user_id: 'owner-1',
            role: 'owner',
            member_name: 'Owner',
            created_at: '2026-01-01',
          },
          {
            list_id: 'list-1',
            user_id: 'editor-1',
            role: 'editor',
            created_at: '2026-01-01',
          },
          {
            list_id: 'list-1',
            user_id: 'viewer-1',
            role: 'viewer',
            member_name: 'Viewer',
            created_at: '2026-01-01',
          },
        ],
      }),
    )

    render(<ListDetailsView id="list-1" />)

    expect(await screen.findByText('Owner')).toBeInTheDocument()
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
    expect(screen.getByText('Viewer')).toBeInTheDocument()
    expect(screen.getByText('★')).toBeInTheDocument()
    expect(screen.getAllByText('✏️').length).toBeGreaterThan(0)
    expect(screen.getAllByText('👁️').length).toBeGreaterThan(0)
  })

  it('shows remove-member modal description with selected member name', async () => {
    mocks.getListDetails.mockResolvedValue(createListDetails({ items: [] }))
    mocks.removeListMember.mockResolvedValue(undefined)

    render(<ListDetailsView id="list-1" />)

    await screen.findByText('Bob')
    await userEvent.click(screen.getByTitle('Remover membro'))

    expect(
      screen.getByText(/Tem certeza que deseja remover Bob desta lista\?/i),
    ).toBeInTheDocument()
  })

  it('shows fallback member label in remove-member description when name is missing', async () => {
    mocks.getListDetails.mockResolvedValue(
      createListDetails({
        items: [],
        members: [
          {
            list_id: 'list-1',
            user_id: 'owner-1',
            role: 'owner',
            member_name: 'Owner',
            created_at: '2026-01-01',
          },
          {
            list_id: 'list-1',
            user_id: 'viewer-1',
            role: 'viewer',
            created_at: '2026-01-01',
          },
        ],
      }),
    )

    render(<ListDetailsView id="list-1" />)

    await screen.findByText('Owner')
    await userEvent.click(screen.getByTitle('Remover membro'))

    expect(
      screen.getByText(/Tem certeza que deseja remover este membro desta lista\?/i),
    ).toBeInTheDocument()
  })
})
