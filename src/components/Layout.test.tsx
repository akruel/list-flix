import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Layout } from './Layout'

const mocks = vi.hoisted(() => ({
  pathname: '/',
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    className,
    children,
  }: {
    to: string
    className?: string
    children: ReactNode
  }) => (
    <a data-to={to} className={className}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="layout-outlet" />,
  useLocation: () => ({ pathname: mocks.pathname }),
}))

vi.mock('./LoginButton', () => ({
  LoginButton: () => <div data-testid="login-button" />,
}))

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    { caseName: 'home route', pathname: '/', activeLabel: 'Início' },
    { caseName: 'search route', pathname: '/search', activeLabel: 'Buscar' },
    { caseName: 'nested lists route', pathname: '/lists/abc', activeLabel: 'Minhas Listas' },
  ])('marks active links for $caseName', ({ pathname, activeLabel }) => {
    mocks.pathname = pathname

    render(<Layout />)

    expect(screen.getByTestId('layout-outlet')).toBeInTheDocument()
    expect(screen.getByTestId('login-button')).toBeInTheDocument()

    const activeLinks = screen.getAllByText(activeLabel)
    expect(activeLinks.length).toBeGreaterThan(0)
    activeLinks.forEach((node) => {
      const link = node.closest('a')
      expect(link?.className).toContain('text-primary')
    })
  })

  it('keeps non-active links muted', () => {
    mocks.pathname = '/search'

    render(<Layout />)

    const homeLinks = screen.getAllByText('Início')
    homeLinks.forEach((node) => {
      const link = node.closest('a')
      expect(link?.className).toContain('text-muted-foreground')
    })
  })
})
