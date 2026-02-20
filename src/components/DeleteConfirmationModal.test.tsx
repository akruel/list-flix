import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeleteConfirmationModal } from './DeleteConfirmationModal'

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({
    children,
    onOpenChange,
  }: {
    children: ReactNode
    onOpenChange: (open: boolean) => void
  }) => (
    <div>
      <button type="button" onClick={() => onOpenChange(false)}>
        trigger-close
      </button>
      {children}
    </div>
  ),
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({
    children,
    disabled,
  }: {
    children: ReactNode
    disabled?: boolean
  }) => (
    <button type="button" disabled={disabled}>
      {children}
    </button>
  ),
}))

describe('DeleteConfirmationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    { caseName: 'idle state', isDeleting: false, expectedText: 'Sim, excluir' },
    { caseName: 'deleting state', isDeleting: true, expectedText: 'Excluindo...' },
  ])('renders $caseName', ({ isDeleting, expectedText }) => {
    render(
      <DeleteConfirmationModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Excluir Lista"
        description="Tem certeza?"
        isDeleting={isDeleting}
      />,
    )

    expect(screen.getByText('Excluir Lista')).toBeInTheDocument()
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: expectedText })).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn()
    render(
      <DeleteConfirmationModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="Excluir Lista"
        description="Tem certeza?"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onClose when dialog closes', async () => {
    const onClose = vi.fn()
    render(
      <DeleteConfirmationModal
        isOpen
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Excluir Lista"
        description="Tem certeza?"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'trigger-close' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
