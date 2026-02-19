import { describe, expect, it } from 'vitest'

import { getPostLoginDestination } from './postLoginNavigation'

describe('getPostLoginDestination', () => {
  it('returns root destination when target is empty', () => {
    expect(getPostLoginDestination(null)).toEqual({ to: '/' })
  })

  it('parses invite route with editor role', () => {
    expect(getPostLoginDestination('/lists/abc-123/join?role=editor')).toEqual({
      to: '/lists/$id/join',
      params: { id: 'abc-123' },
      search: { role: 'editor' },
    })
  })

  it('drops invalid role and keeps invite destination', () => {
    expect(getPostLoginDestination('/lists/abc-123/join?role=owner')).toEqual({
      to: '/lists/$id/join',
      params: { id: 'abc-123' },
    })
  })

  it('falls back to root for non-invite path', () => {
    expect(getPostLoginDestination('/search')).toEqual({ to: '/' })
  })
})
