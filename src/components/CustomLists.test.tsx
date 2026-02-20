import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CustomLists } from './CustomLists'

const mocks = vi.hoisted(() => ({
  storeValue: {
    lists: [] as Array<{
      id: string
      name: string
      owner_id: string
      created_at: string
      updated_at: string
      role: 'owner' | 'editor' | 'viewer'
    }>,
    fetchLists: vi.fn(),
    createList: vi.fn(),
    deleteList: vi.fn(),
  },
  addListItem: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('../store/useStore', () => ({
  useStore: () => mocks.storeValue,
}))

vi.mock('../services/listService', () => ({
  listService: {
    addListItem: (...args: unknown[]) => mocks.addListItem(...args),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mocks.toastSuccess(...args),
    error: (...args: unknown[]) => mocks.toastError(...args),
  },
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
  }: {
    children: ReactNode
    to: string
  }) => <a data-to={to}>{children}</a>,
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

vi.mock('./DeleteConfirmationModal', () => ({
  DeleteConfirmationModal: ({
    onConfirm,
    onClose,
  }: {
    onConfirm: () => void
    onClose: () => void
  }) =>
    (
      <div>
        <button type="button" onClick={onConfirm}>
          confirm-delete
        </button>
        <button type="button" onClick={onClose}>
          close-delete
        </button>
      </div>
    ),
}))

vi.mock('./MagicSearchModal', () => ({
  MagicSearchModal: ({
    isOpen,
    onSaveList,
    onClose,
  }: {
    isOpen: boolean
    onSaveList: (name: string, items: Array<{ id: number; media_type: 'movie' | 'tv' }>) => Promise<void>
    onClose: () => void
  }) =>
    isOpen ? (
      <div>
        <button
          type="button"
          onClick={() =>
            void onSaveList('Magic List', [
              { id: 10, media_type: 'movie' },
              { id: 20, media_type: 'tv' },
            ]).catch(() => {})
          }
        >
          save-magic
        </button>
        <button type="button" onClick={onClose}>
          close-magic
        </button>
      </div>
    ) : null,
}))

describe('CustomLists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.storeValue.lists = []
    mocks.storeValue.fetchLists.mockResolvedValue(undefined)
    mocks.storeValue.createList.mockResolvedValue({
      id: 'list-1',
      name: 'Created',
      owner_id: 'owner-1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      role: 'owner',
    })
    mocks.storeValue.deleteList.mockResolvedValue(undefined)
    mocks.addListItem.mockResolvedValue(undefined)
  })

  it('loads lists on mount and shows empty state', async () => {
    render(<CustomLists />)

    await waitFor(() => {
      expect(mocks.storeValue.fetchLists).toHaveBeenCalledOnce()
    })
    expect(screen.getByText('Você ainda não criou nenhuma lista personalizada.')).toBeInTheDocument()
  })

  it('creates manual list', async () => {
    render(<CustomLists />)

    await userEvent.click(screen.getByRole('button', { name: /Lista Manual/i }))
    await userEvent.type(screen.getByPlaceholderText('Nome da Lista'), 'Minha Lista')
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))

    await waitFor(() => {
      expect(mocks.storeValue.createList).toHaveBeenCalledWith('Minha Lista')
    })
  })

  it('does not create list when manual name is empty', async () => {
    render(<CustomLists />)

    await userEvent.click(screen.getByRole('button', { name: /Lista Manual/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))

    expect(mocks.storeValue.createList).not.toHaveBeenCalled()
  })

  it('cancels manual creation form', async () => {
    render(<CustomLists />)

    await userEvent.click(screen.getByRole('button', { name: /Lista Manual/i }))
    expect(screen.getByPlaceholderText('Nome da Lista')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByPlaceholderText('Nome da Lista')).not.toBeInTheDocument()
  })

  it.each([
    {
      caseName: 'owner list shows delete button',
      role: 'owner' as const,
      shouldShowDelete: true,
    },
    {
      caseName: 'viewer list hides delete button',
      role: 'viewer' as const,
      shouldShowDelete: false,
    },
  ])('renders role behavior for $caseName', ({ role, shouldShowDelete }) => {
    mocks.storeValue.lists = [
      {
        id: 'list-1',
        name: 'List',
        owner_id: 'owner-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        role,
      },
    ]

    render(<CustomLists />)

    if (shouldShowDelete) {
      expect(screen.getByTitle('Excluir Lista')).toBeInTheDocument()
    } else {
      expect(screen.queryByTitle('Excluir Lista')).not.toBeInTheDocument()
    }
  })

  it('deletes list and shows success toast', async () => {
    mocks.storeValue.lists = [
      {
        id: 'list-1',
        name: 'List',
        owner_id: 'owner-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        role: 'owner',
      },
    ]

    render(<CustomLists />)

    await userEvent.click(screen.getByTitle('Excluir Lista'))
    await userEvent.click(screen.getByRole('button', { name: 'confirm-delete' }))

    await waitFor(() => {
      expect(mocks.storeValue.deleteList).toHaveBeenCalledWith('list-1')
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Lista excluída com sucesso')
  })

  it('returns early when delete is confirmed without selected list', async () => {
    render(<CustomLists />)

    await userEvent.click(screen.getByRole('button', { name: 'confirm-delete' }))

    expect(mocks.storeValue.deleteList).not.toHaveBeenCalled()
  })

  it('closes delete modal through onClose callback', async () => {
    render(<CustomLists />)

    await userEvent.click(screen.getByRole('button', { name: 'close-delete' }))

    expect(mocks.storeValue.deleteList).not.toHaveBeenCalled()
  })

  it('shows error toast when delete fails', async () => {
    mocks.storeValue.lists = [
      {
        id: 'list-1',
        name: 'List',
        owner_id: 'owner-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        role: 'owner',
      },
    ]
    mocks.storeValue.deleteList.mockRejectedValue(new Error('delete failed'))

    render(<CustomLists />)

    await userEvent.click(screen.getByTitle('Excluir Lista'))
    await userEvent.click(screen.getByRole('button', { name: 'confirm-delete' }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Erro ao excluir lista')
    })
  })

  it('saves magic list by creating list, adding items and refreshing lists', async () => {
    mocks.storeValue.createList.mockResolvedValue({
      id: 'new-list',
      name: 'Magic List',
      owner_id: 'owner-1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      role: 'owner',
    })

    render(<CustomLists />)

    await userEvent.click(screen.getByRole('button', { name: /Lista Inteligente/i }))
    await userEvent.click(screen.getByRole('button', { name: 'save-magic' }))

    await waitFor(() => {
      expect(mocks.storeValue.createList).toHaveBeenCalledWith('Magic List')
    })
    expect(mocks.addListItem).toHaveBeenNthCalledWith(
      1,
      'new-list',
      expect.objectContaining({ id: 10, media_type: 'movie' }),
    )
    expect(mocks.addListItem).toHaveBeenNthCalledWith(
      2,
      'new-list',
      expect.objectContaining({ id: 20, media_type: 'tv' }),
    )
    expect(mocks.storeValue.fetchLists).toHaveBeenCalled()
  })

  it('propagates magic list save error to modal and shows error path', async () => {
    mocks.storeValue.createList.mockRejectedValue(new Error('create failed'))

    render(<CustomLists />)

    await userEvent.click(screen.getByRole('button', { name: /Lista Inteligente/i }))
    await userEvent.click(screen.getByRole('button', { name: 'save-magic' }))

    await waitFor(() => {
      expect(mocks.storeValue.createList).toHaveBeenCalled()
    })
  })

  it('closes magic modal through onClose callback', async () => {
    render(<CustomLists />)

    await userEvent.click(screen.getByRole('button', { name: /Lista Inteligente/i }))
    await userEvent.click(screen.getByRole('button', { name: 'close-magic' }))

    expect(screen.queryByRole('button', { name: 'save-magic' })).not.toBeInTheDocument()
  })
})
