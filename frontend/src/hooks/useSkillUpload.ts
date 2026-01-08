import { useState, useCallback } from 'react'
import { uploadSkill } from '@/services/skillsApi'
import { useAppState } from './useAppState'
import type { SkillPackage } from '@/types'

interface UseSkillUploadResult {
  upload: (file: File) => Promise<SkillPackage | null>
  isUploading: boolean
  error: string | null
  clearError: () => void
}

export function useSkillUpload(): UseSkillUploadResult {
  const { setCurrentSkill, setIsUploading } = useAppState()
  const [isUploading, setLocalUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (file: File): Promise<SkillPackage | null> => {
      // Validate file
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError('Please upload a .zip file')
        return null
      }

      // Check file size (10MB max)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        setError('File size exceeds 10MB limit')
        return null
      }

      setError(null)
      setLocalUploading(true)
      setIsUploading(true)

      try {
        const result = await uploadSkill(file)
        setCurrentSkill(result)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setError(message)
        return null
      } finally {
        setLocalUploading(false)
        setIsUploading(false)
      }
    },
    [setCurrentSkill, setIsUploading]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    upload,
    isUploading,
    error,
    clearError,
  }
}
