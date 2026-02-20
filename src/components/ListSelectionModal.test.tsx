import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ListSelectionModal } from './ListSelectionModal'

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
    addToList: vi.fn(),
    removeFromList: vi.fn(),
    isInList: vi.fn(),
  },
  getListsContainingContent: vi.fn(),
  removeListItem: vi.fn(),
  addListItem: vi.fn(),
}))

vi.mock('../store/useStore', () => ({
  useStore: () => mocks.storeValue,
}))

vi.mock('../services/listService', () => ({
  listService: {
    getListsContainingContent: (...args: unknown[]) => mocks.getListsContainingContent(...args),
    removeListItem: (...args: unknown[]) => mocks.removeListItem(...args),
    addListItem: (...args: unknown[]) => mocks.addListItem(...args),
  },
}))

vi.mock('./skeletons', () => ({
  ListSelectionModalSkeleton: () => <div data-testid="list-selection-skeleton" />,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    onOpenChange,
  }: {
    children: ReactNode
    onOpenChange?: (open: boolean) => void
  }) => (
    <div>
      <button type="button" onClick={() => onOpenChange?.(true)}>
        dialog-open
      </button>
      <button type="button" onClick={() => onOpenChange?.(false)}>
        dialog-close
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

describe('ListSelectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.storeValue.lists = []
    mocks.storeValue.fetchLists.mockResolvedValue(undefined)
    mocks.storeValue.isInList.mockReturnValue(false)
    mocks.getListsContainingContent.mockResolvedValue({})
    mocks.removeListItem.mockResolvedValue(undefined)
    mocks.addListItem.mockResolvedValue(undefined)
  })

  const content = {
    id: 10,
    media_type: 'movie' as const,
    title: 'Movie',
  }

  it('loads lists and membership when opened', async () => {
    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />)

    await waitFor(() => {
      expect(mocks.storeValue.fetchLists).toHaveBeenCalledOnce()
    })
    expect(mocks.getListsContainingContent).toHaveBeenCalledWith(10, 'movie')
  })

  it('shows custom empty state when no custom lists exist', async () => {
    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />)

    expect(await screen.findByText('Nenhuma lista personalizada encontrada.')).toBeInTheDocument()
  })

  it.each([
    {
      caseName: 'remove from default list',
      inList: true,
      expectedCall: 'remove',
    },
    {
      caseName: 'add to default list',
      inList: false,
      expectedCall: 'add',
    },
  ])('toggles default list for $caseName', async ({ inList, expectedCall }) => {
    mocks.storeValue.isInList.mockReturnValue(inList)

    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />)

    await screen.findByText('Minha Lista')
    await userEvent.click(screen.getByRole('button', { name: /Minha Lista/i }))

    if (expectedCall === 'remove') {
      expect(mocks.storeValue.removeFromList).toHaveBeenCalledWith(10)
      expect(mocks.storeValue.addToList).not.toHaveBeenCalled()
    } else {
      expect(mocks.storeValue.addToList).toHaveBeenCalledWith(content)
      expect(mocks.storeValue.removeFromList).not.toHaveBeenCalled()
    }
  })

  it('toggles custom list removal when membership exists', async () => {
    mocks.storeValue.lists = [
      {
        id: 'list-1',
        name: 'Owner list',
        owner_id: 'owner-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        role: 'owner',
      },
      {
        id: 'list-2',
        name: 'Viewer list',
        owner_id: 'owner-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        role: 'viewer',
      },
    ]
    mocks.getListsContainingContent.mockResolvedValue({
      'list-1': 'item-1',
    })

    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />)

    await waitFor(() => {
      expect(screen.getByText('Owner list')).toBeInTheDocument()
    })
    expect(screen.queryByText('Viewer list')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Owner list/i }))

    await waitFor(() => {
      expect(mocks.removeListItem).toHaveBeenCalledWith('item-1')
    })
  })

  it('toggles custom list add when membership does not exist', async () => {
    mocks.storeValue.lists = [
      {
        id: 'list-1',
        name: 'Editor list',
        owner_id: 'owner-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        role: 'editor',
      },
    ]
    mocks.getListsContainingContent
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ 'list-1': 'item-99' })

    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />)

    await waitFor(() => {
      expect(screen.getByText('Editor list')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /Editor list/i }))

    await waitFor(() => {
      expect(mocks.addListItem).toHaveBeenCalledWith('list-1', content)
    })
    expect(mocks.getListsContainingContent).toHaveBeenCalledTimes(2)
  })

  it('handles loading errors without crashing', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.storeValue.fetchLists.mockRejectedValue(new Error('load failed'))

    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('handles toggle errors without crashing', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.storeValue.lists = [
      {
        id: 'list-1',
        name: 'Owner list',
        owner_id: 'owner-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        role: 'owner',
      },
    ]
    mocks.getListsContainingContent.mockResolvedValue({
      'list-1': 'item-1',
    })
    mocks.removeListItem.mockRejectedValue(new Error('toggle failed'))

    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />)

    await waitFor(() => {
      expect(screen.getByText('Owner list')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /Owner list/i }))

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('closes modal when concluído button is clicked', async () => {
    const onClose = vi.fn()
    render(<ListSelectionModal isOpen onClose={onClose} content={content} />)

    await userEvent.click(screen.getByRole('button', { name: 'Concluído' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it.each([
    { caseName: 'onOpenChange(false)', trigger: 'dialog-close', expectedCalls: 1 },
    { caseName: 'onOpenChange(true)', trigger: 'dialog-open', expectedCalls: 0 },
  ])('handles dialog close behavior for $caseName', async ({ trigger, expectedCalls }) => {
    const onClose = vi.fn()
    render(<ListSelectionModal isOpen onClose={onClose} content={content} />)

    await userEvent.click(screen.getByRole('button', { name: trigger }))

    expect(onClose).toHaveBeenCalledTimes(expectedCalls)
  })
})
