import { useState, useCallback } from 'react'
import { getFileTree, getFileContent } from '@/services/skillsApi'
import { useAppState } from './useAppState'
import type { SkillFile, FileTreeResponse } from '@/types'

interface UseFileExplorerResult {
  fileTree: FileTreeResponse | null
  selectedFile: SkillFile | null
  isLoading: boolean
  error: string | null
  loadFileTree: () => Promise<void>
  selectFile: (filePath: string) => Promise<void>
  clearSelection: () => void
}

export function useFileExplorer(): UseFileExplorerResult {
  const { currentSkill, setSelectedFilePath } = useAppState()
  const [fileTree, setFileTree] = useState<FileTreeResponse | null>(null)
  const [selectedFile, setSelectedFile] = useState<SkillFile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFileTree = useCallback(async () => {
    if (!currentSkill) {
      setError('No skill package loaded')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const tree = await getFileTree(currentSkill.id)
      setFileTree(tree)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load file tree'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [currentSkill])

  const selectFile = useCallback(
    async (filePath: string) => {
      if (!currentSkill) {
        setError('No skill package loaded')
        return
      }

      setIsLoading(true)
      setError(null)
      setSelectedFilePath(filePath)

      try {
        const file = await getFileContent(currentSkill.id, filePath)
        setSelectedFile(file)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load file'
        setError(message)
        setSelectedFile(null)
      } finally {
        setIsLoading(false)
      }
    },
    [currentSkill, setSelectedFilePath]
  )

  const clearSelection = useCallback(() => {
    setSelectedFile(null)
    setSelectedFilePath(null)
  }, [setSelectedFilePath])

  return {
    fileTree,
    selectedFile,
    isLoading,
    error,
    loadFileTree,
    selectFile,
    clearSelection,
  }
}
