import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { reducer } from './use-toast'

describe('use-toast reducer', () => {
  it.each([
    {
      caseName: 'add toast',
      action: {
        type: 'ADD_TOAST',
        toast: { id: '1', title: 'A', open: true },
      },
      initial: { toasts: [] },
      expectedLength: 1,
    },
    {
      caseName: 'add toast respects limit',
      action: {
        type: 'ADD_TOAST',
        toast: { id: '2', title: 'B', open: true },
      },
      initial: { toasts: [{ id: '1', title: 'A', open: true }] },
      expectedLength: 1,
    },
  ])('$caseName', ({ action, initial, expectedLength }) => {
    const next = reducer(initial, action as never)
    expect(next.toasts).toHaveLength(expectedLength)
  })

  it('updates toast by id', () => {
    const next = reducer(
      {
        toasts: [{ id: '1', title: 'Old', open: true }],
      },
      {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'New' },
      } as never,
    )

    expect(next.toasts[0]?.title).toBe('New')
  })

  it('keeps toast unchanged when UPDATE_TOAST id does not match', () => {
    const next = reducer(
      {
        toasts: [{ id: '1', title: 'Old', open: true }],
      },
      {
        type: 'UPDATE_TOAST',
        toast: { id: '2', title: 'Ignored' },
      } as never,
    )

    expect(next.toasts[0]?.title).toBe('Old')
  })

  it.each([
    {
      caseName: 'dismiss specific toast',
      action: { type: 'DISMISS_TOAST', toastId: '1' },
      expectedOpen: [false, true],
    },
    {
      caseName: 'dismiss all toasts',
      action: { type: 'DISMISS_TOAST' },
      expectedOpen: [false, false],
    },
  ])('handles $caseName', ({ action, expectedOpen }) => {
    const next = reducer(
      {
        toasts: [
          { id: '1', title: 'A', open: true },
          { id: '2', title: 'B', open: true },
        ],
      },
      action as never,
    )

    expect(next.toasts.map((t) => t.open)).toEqual(expectedOpen)
  })

  it.each([
    {
      caseName: 'remove specific toast',
      action: { type: 'REMOVE_TOAST', toastId: '1' },
      expectedIds: ['2'],
    },
    {
      caseName: 'remove all toasts',
      action: { type: 'REMOVE_TOAST' },
      expectedIds: [],
    },
  ])('handles $caseName', ({ action, expectedIds }) => {
    const next = reducer(
      {
        toasts: [
          { id: '1', title: 'A', open: true },
          { id: '2', title: 'B', open: true },
        ],
      },
      action as never,
    )

    expect(next.toasts.map((t) => t.id)).toEqual(expectedIds)
  })
})

describe('useToast runtime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  it('creates, dismisses and removes toasts over time', async () => {
    const { useToast, toast } = await import('./use-toast')
    const { result } = renderHook(() => useToast())

    let handle: ReturnType<typeof toast> | undefined
    act(() => {
      handle = toast({ title: 'Hello' })
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0]?.title).toBe('Hello')
    expect(result.current.toasts[0]?.open).toBe(true)

    act(() => {
      handle?.update({ title: 'Updated title' } as never)
    })
    expect(result.current.toasts[0]?.title).toBe('Updated title')

    act(() => {
      handle?.dismiss()
    })

    expect(result.current.toasts[0]?.open).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1_000_000)
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it('dismisses all toasts via hook api', async () => {
    const { useToast, toast } = await import('./use-toast')
    const { result } = renderHook(() => useToast())

    act(() => {
      toast({ title: 'A' })
      toast({ title: 'B' })
    })

    act(() => {
      result.current.dismiss()
    })

    expect(result.current.toasts.every((toastItem) => toastItem.open === false)).toBe(true)
  })

  it('dismisses a toast when onOpenChange is called with false', async () => {
    const { useToast, toast } = await import('./use-toast')
    const { result } = renderHook(() => useToast())

    act(() => {
      toast({ title: 'A' })
    })

    act(() => {
      result.current.toasts[0]?.onOpenChange?.(false)
    })

    expect(result.current.toasts[0]?.open).toBe(false)
  })

  it('handles duplicate dismiss calls for the same toast', async () => {
    const { useToast, toast } = await import('./use-toast')
    const { result } = renderHook(() => useToast())

    let handle: ReturnType<typeof toast> | undefined
    act(() => {
      handle = toast({ title: 'A' })
    })

    act(() => {
      handle?.dismiss()
      handle?.dismiss()
    })

    act(() => {
      vi.advanceTimersByTime(1_000_000)
    })

    expect(result.current.toasts).toHaveLength(0)
  })
})
