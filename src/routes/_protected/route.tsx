import { useEffect, useRef, useState } from 'react'
import { createFileRoute, redirect, useLocation } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { MigrationConflictModal } from '@/components/MigrationConflictModal'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/auth'
import { useStore } from '@/store/useStore'

const FullScreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
)

export const Route = createFileRoute('/_protected')({
  beforeLoad: ({ context, location }) => {
    if (context.auth.status === 'none') {
      authService.savePostLoginTarget(`${location.pathname}${window.location.search}`)
      throw redirect({ to: '/auth' })
    }
  },
  component: ProtectedLayoutRouteComponent,
})

function ProtectedLayoutRouteComponent() {
  const { status, user } = useAuth()
  const syncWithSupabase = useStore((state) => state.syncWithSupabase)
  const location = useLocation()

  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [isSessionProcessing, setIsSessionProcessing] = useState(false)
  const lastHandledUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (status === 'none') {
      setShowMigrationModal(false)
      setIsSessionProcessing(false)
      lastHandledUserIdRef.current = null
    }
  }, [status])

  useEffect(() => {
    if (status !== 'anonymous' && status !== 'authenticated') return

    const userId = user?.id
    if (!userId) return
    if (lastHandledUserIdRef.current === userId) return

    let cancelled = false

    const initializeSession = async () => {
      setIsSessionProcessing(true)

      try {
        const finalizeResult = await authService.finalizePostLogin()
        if (cancelled) return

        if (finalizeResult.migrationConflict) {
          setShowMigrationModal(true)
          return
        }

        await syncWithSupabase()
        if (cancelled) return
        lastHandledUserIdRef.current = userId
      } catch (error) {
        console.error('Session initialization failed:', error)
      } finally {
        if (!cancelled) {
          setIsSessionProcessing(false)
        }
      }
    }

    void initializeSession()

    return () => {
      cancelled = true
    }
  }, [location.pathname, status, syncWithSupabase, user?.id])

  const handleKeepLocal = async () => {
    const oldUserId = localStorage.getItem(authService.MIGRATION_OLD_USER_ID_KEY)
    const newUserId = user?.id ?? await authService.getUserId()

    if (oldUserId && newUserId) {
      try {
        await authService.migrateAnonymousData(oldUserId, newUserId)
      } catch (error) {
        console.error('Manual migration failed:', error)
      }
    }

    authService.clearMigrationOldUserId()
    setShowMigrationModal(false)

    try {
      await syncWithSupabase()
      if (newUserId) {
        lastHandledUserIdRef.current = newUserId
      }
    } catch (error) {
      console.error('Sync after manual migration failed:', error)
    }
  }

  const handleUseAccount = async () => {
    const currentUserId = user?.id ?? await authService.getUserId()

    authService.clearMigrationOldUserId()
    setShowMigrationModal(false)

    try {
      await syncWithSupabase()
      if (currentUserId) {
        lastHandledUserIdRef.current = currentUserId
      }
    } catch (error) {
      console.error('Sync after selecting account data failed:', error)
    }
  }

  const isProtectedBlocked =
    status === 'loading' ||
    status === 'none' ||
    isSessionProcessing ||
    showMigrationModal

  if (isProtectedBlocked) {
    return (
      <>
        <FullScreenLoader />
        <MigrationConflictModal
          isOpen={showMigrationModal}
          onKeepLocal={handleKeepLocal}
          onUseAccount={handleUseAccount}
        />
      </>
    )
  }

  return (
    <>
      <MigrationConflictModal
        isOpen={showMigrationModal}
        onKeepLocal={handleKeepLocal}
        onUseAccount={handleUseAccount}
      />
      <Layout />
    </>
  )
}
