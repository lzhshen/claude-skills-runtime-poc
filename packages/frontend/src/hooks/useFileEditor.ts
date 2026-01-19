import { useState, useCallback, useEffect } from 'react'
import { updateFileContent } from '@/services/skillsApi'
import { useAppState } from './useAppState'
import type { SkillFile } from '@/types'

interface UseFileEditorResult {
  editedContent: string
  originalContent: string
  hasChanges: boolean
  isSaving: boolean
  error: string | null
  setEditedContent: (content: string) => void
  saveChanges: () => Promise<boolean>
  revertChanges: () => void
  loadFile: (file: SkillFile) => void
}

export function useFileEditor(): UseFileEditorResult {
  const { currentSkill } = useAppState()
  const [currentFile, setCurrentFile] = useState<SkillFile | null>(null)
  const [originalContent, setOriginalContent] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasChanges = editedContent !== originalContent

  const loadFile = useCallback((file: SkillFile) => {
    setCurrentFile(file)
    const content = file.content || ''
    setOriginalContent(content)
    setEditedContent(content)
    setError(null)
  }, [])

  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (!currentSkill || !currentFile || !hasChanges) {
      return false
    }

    setIsSaving(true)
    setError(null)

    try {
      const updatedFile = await updateFileContent(currentSkill.id, currentFile.path, editedContent)

      // Update original content to the new saved content
      setOriginalContent(updatedFile.content || editedContent)
      setCurrentFile(updatedFile)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save file'
      setError(message)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [currentSkill, currentFile, editedContent, hasChanges])

  const revertChanges = useCallback(() => {
    setEditedContent(originalContent)
    setError(null)
  }, [originalContent])

  // Reset state when skill changes
  useEffect(() => {
    if (!currentSkill) {
      setCurrentFile(null)
      setOriginalContent('')
      setEditedContent('')
      setError(null)
    }
  }, [currentSkill])

  return {
    editedContent,
    originalContent,
    hasChanges,
    isSaving,
    error,
    setEditedContent,
    saveChanges,
    revertChanges,
    loadFile,
  }
}
