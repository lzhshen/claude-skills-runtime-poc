import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { SkillPackage, ExecutionSession } from '@/types'

interface AppState {
  currentSkill: SkillPackage | null
  currentExecution: ExecutionSession | null
  executionHistory: ExecutionSession[]
  isUploading: boolean
  isExecuting: boolean
  selectedFilePath: string | null
}

interface AppStateContextValue extends AppState {
  setCurrentSkill: (skill: SkillPackage | null) => void
  setCurrentExecution: (execution: ExecutionSession | null) => void
  addExecutionToHistory: (execution: ExecutionSession) => void
  updateExecutionInHistory: (execution: ExecutionSession) => void
  setIsUploading: (isUploading: boolean) => void
  setIsExecuting: (isExecuting: boolean) => void
  setSelectedFilePath: (path: string | null) => void
  reset: () => void
}

const initialState: AppState = {
  currentSkill: null,
  currentExecution: null,
  executionHistory: [],
  isUploading: false,
  isExecuting: false,
  selectedFilePath: null,
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState)

  const setCurrentSkill = useCallback((skill: SkillPackage | null) => {
    setState((prev) => ({ ...prev, currentSkill: skill, selectedFilePath: null }))
  }, [])

  const setCurrentExecution = useCallback((execution: ExecutionSession | null) => {
    setState((prev) => ({ ...prev, currentExecution: execution }))
  }, [])

  const addExecutionToHistory = useCallback((execution: ExecutionSession) => {
    setState((prev) => ({
      ...prev,
      executionHistory: [execution, ...prev.executionHistory],
    }))
  }, [])

  const updateExecutionInHistory = useCallback((execution: ExecutionSession) => {
    setState((prev) => ({
      ...prev,
      executionHistory: prev.executionHistory.map((e) => (e.id === execution.id ? execution : e)),
      currentExecution:
        prev.currentExecution?.id === execution.id ? execution : prev.currentExecution,
    }))
  }, [])

  const setIsUploading = useCallback((isUploading: boolean) => {
    setState((prev) => ({ ...prev, isUploading }))
  }, [])

  const setIsExecuting = useCallback((isExecuting: boolean) => {
    setState((prev) => ({ ...prev, isExecuting }))
  }, [])

  const setSelectedFilePath = useCallback((path: string | null) => {
    setState((prev) => ({ ...prev, selectedFilePath: path }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  const value: AppStateContextValue = {
    ...state,
    setCurrentSkill,
    setCurrentExecution,
    addExecutionToHistory,
    updateExecutionInHistory,
    setIsUploading,
    setIsExecuting,
    setSelectedFilePath,
    reset,
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider')
  }
  return context
}
