import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LoginOptionsDialog } from './LoginOptionsDialog'

const mocks = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  signInWithOtp: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    signInWithGoogle: mocks.signInWithGoogle,
    signInWithOtp: mocks.signInWithOtp,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))

describe('LoginOptionsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signInWithGoogle.mockResolvedValue(undefined)
    mocks.signInWithOtp.mockResolvedValue(undefined)
  })

  it.each([
    {
      caseName: 'google login success',
      setup: () => mocks.signInWithGoogle.mockResolvedValue(undefined),
      shouldError: false,
    },
    {
      caseName: 'google login failure',
      setup: () => mocks.signInWithGoogle.mockRejectedValue(new Error('google failed')),
      shouldError: true,
    },
  ])('handles $caseName', async ({ setup, shouldError }) => {
    setup()

    render(<LoginOptionsDialog open onOpenChange={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /Continuar com Google/i }))

    await waitFor(() => {
      expect(mocks.signInWithGoogle).toHaveBeenCalledOnce()
    })

    if (shouldError) {
      expect(mocks.toastError).toHaveBeenCalledWith('Não foi possível iniciar login com Google.')
    } else {
      expect(mocks.toastError).not.toHaveBeenCalled()
    }
  })

  it('opens and closes email input', async () => {
    render(<LoginOptionsDialog open onOpenChange={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /Entrar com Email/i }))
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument()

    const buttons = screen.getAllByRole('button')
    await userEvent.click(buttons[buttons.length - 1]!)
    expect(screen.queryByPlaceholderText('seu@email.com')).not.toBeInTheDocument()
  })

  it('does not submit otp when email is empty', async () => {
    render(<LoginOptionsDialog open onOpenChange={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /Entrar com Email/i }))
    await userEvent.click(screen.getByRole('button', { name: /Enviar link/i }))

    expect(mocks.signInWithOtp).not.toHaveBeenCalled()
  })

  it.each([
    {
      caseName: 'otp success',
      setup: () => mocks.signInWithOtp.mockResolvedValue(undefined),
      shouldClose: true,
      shouldError: false,
    },
    {
      caseName: 'otp failure',
      setup: () => mocks.signInWithOtp.mockRejectedValue(new Error('otp failed')),
      shouldClose: false,
      shouldError: true,
    },
  ])('handles $caseName', async ({ setup, shouldClose, shouldError }) => {
    setup()
    const onOpenChange = vi.fn()

    render(<LoginOptionsDialog open onOpenChange={onOpenChange} />)

    await userEvent.click(screen.getByRole('button', { name: /Entrar com Email/i }))
    await userEvent.type(screen.getByPlaceholderText('seu@email.com'), 'alice@example.com')
    await userEvent.click(screen.getByRole('button', { name: /Enviar link/i }))

    await waitFor(() => {
      expect(mocks.signInWithOtp).toHaveBeenCalledWith('alice@example.com')
    })

    if (shouldClose) {
      expect(mocks.toastSuccess).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    }

    if (shouldError) {
      expect(mocks.toastError).toHaveBeenCalledWith('Erro ao enviar link de login.')
    }
  })
})
