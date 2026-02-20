import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LogoutChoiceDialog } from './LogoutChoiceDialog'

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
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

describe('LogoutChoiceDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    { caseName: 'idle state', isLoading: false, disabled: false },
    { caseName: 'loading state', isLoading: true, disabled: true },
  ])('renders $caseName', ({ isLoading, disabled }) => {
    render(
      <LogoutChoiceDialog
        open
        onOpenChange={vi.fn()}
        onContinueAsGuest={vi.fn()}
        onSignOutFully={vi.fn()}
        isLoading={isLoading}
      />,
    )

    expect(screen.getByText('Como você quer sair?')).toBeInTheDocument()
    if (disabled) {
      expect(screen.getByRole('button', { name: 'Continuar como visitante' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Sair totalmente' })).toBeDisabled()
    } else {
      expect(screen.getByRole('button', { name: 'Continuar como visitante' })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: 'Sair totalmente' })).not.toBeDisabled()
    }
  })

  it('calls action callbacks', async () => {
    const onContinueAsGuest = vi.fn()
    const onSignOutFully = vi.fn()

    render(
      <LogoutChoiceDialog
        open
        onOpenChange={vi.fn()}
        onContinueAsGuest={onContinueAsGuest}
        onSignOutFully={onSignOutFully}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Continuar como visitante' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sair totalmente' }))

    expect(onContinueAsGuest).toHaveBeenCalledOnce()
    expect(onSignOutFully).toHaveBeenCalledOnce()
  })

  it('calls onOpenChange on dialog close', async () => {
    const onOpenChange = vi.fn()

    render(
      <LogoutChoiceDialog
        open
        onOpenChange={onOpenChange}
        onContinueAsGuest={vi.fn()}
        onSignOutFully={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'close-dialog' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
