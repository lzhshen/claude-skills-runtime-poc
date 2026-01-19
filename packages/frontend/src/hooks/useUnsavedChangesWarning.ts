import { useEffect, useCallback } from 'react'

interface UseUnsavedChangesWarningOptions {
  hasChanges: boolean
  message?: string
}

export function useUnsavedChangesWarning({
  hasChanges,
  message = 'You have unsaved changes. Are you sure you want to leave?',
}: UseUnsavedChangesWarningOptions): void {
  const handleBeforeUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      if (hasChanges) {
        event.preventDefault()
        // Modern browsers require returnValue to be set
        event.returnValue = message
        return message
      }
    },
    [hasChanges, message]
  )

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [handleBeforeUnload])
}
