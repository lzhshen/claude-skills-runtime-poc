import { render, screen, fireEvent } from '@testing-library/react'
import { SkillRunner } from '@/components/runner/SkillRunner'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock hook
const mockStartExecution = vi.fn()
const mockCancelExecution = vi.fn()
const mockSetPrompt = vi.fn()
const mockSetSelectedProvider = vi.fn()
const mockSetSelectedModel = vi.fn()
const mockSetDebugMode = vi.fn()
const mockClearLogs = vi.fn()

const defaultHookValues = {
  status: 'pending',
  logs: [],
  error: null,
  providers: [
    { id: 'local', name: 'Local', models: [{ id: 'GLM-4.7', name: 'GLM-4.7' }] }
  ],
  selectedProvider: 'local',
  selectedModel: 'GLM-4.7',
  prompt: '',
  debugMode: false,
  setPrompt: mockSetPrompt,
  setSelectedProvider: mockSetSelectedProvider,
  setSelectedModel: mockSetSelectedModel,
  setDebugMode: mockSetDebugMode,
  startExecution: mockStartExecution,
  cancelCurrentExecution: mockCancelExecution,
  clearLogs: mockClearLogs,
}

let hookValues = { ...defaultHookValues }

vi.mock('@/hooks/useSkillExecution', () => ({
  useSkillExecution: () => hookValues,
}))

describe('SkillRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hookValues = { ...defaultHookValues }
  })

  it('renders correctly', () => {
    render(<SkillRunner />)
    expect(screen.getByRole('heading', { name: /run skill/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your prompt to run the skill...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /run skill/i })).toBeInTheDocument()
  })

  it('handles prompt input', () => {
    render(<SkillRunner />)
    const textarea = screen.getByPlaceholderText('Enter your prompt to run the skill...')
    fireEvent.change(textarea, { target: { value: 'Test prompt' } })
    expect(mockSetPrompt).toHaveBeenCalledWith('Test prompt')
  })

  it('disables run button when prompt is empty', () => {
    hookValues.prompt = ''
    render(<SkillRunner />)
    const runButton = screen.getByRole('button', { name: /run skill/i })
    expect(runButton).toBeDisabled()
  })

  it('enables run button when prompt is present', () => {
    hookValues.prompt = 'Start'
    render(<SkillRunner />)
    const runButton = screen.getByRole('button', { name: /run skill/i })
    expect(runButton).not.toBeDisabled()
  })

  it('shows running state', () => {
    hookValues.status = 'running'
    hookValues.prompt = 'Running...'
    render(<SkillRunner />)
    
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your prompt to run the skill...')).toBeDisabled()
  })

  it('handles cancel execution', () => {
    hookValues.status = 'running'
    render(<SkillRunner />)
    
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockCancelExecution).toHaveBeenCalled()
  })

  it('shows clear logs button when logs exist', () => {
    hookValues.logs = [{ id: '1', type: 'message', content: 'log' }]
    render(<SkillRunner />)
    
    expect(screen.getByText('Clear logs')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Clear logs'))
    expect(mockClearLogs).toHaveBeenCalled()
  })
})
