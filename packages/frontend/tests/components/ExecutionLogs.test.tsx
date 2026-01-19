import { render, screen } from '@testing-library/react'
import { ExecutionDetailPanel } from '@/components/logs/ExecutionDetailPanel'
import { describe, it, expect } from 'vitest'
import type { ExecutionSession } from '@/types'

// Mock sub-components to isolate test
vi.mock('@/components/logs/ConversationHistory', () => ({
  ConversationHistory: () => <div data-testid="conversation-history">Conversation History</div>
}))

vi.mock('@/components/logs/ToolCallViewer', () => ({
  ToolCallViewer: () => <div data-testid="tool-call-viewer">Tool Call Viewer</div>
}))

const mockSession: ExecutionSession = {
  id: 'session-123',
  skill_package_id: 'skill-1',
  skill_name: 'Test Skill',
  user_prompt: 'Run this',
  status: 'completed',
  started_at: '2023-01-01T10:00:00Z',
  ended_at: '2023-01-01T10:00:05Z',
  logs: []
}

describe('ExecutionDetailPanel', () => {
  it('renders session details', () => {
    render(<ExecutionDetailPanel session={mockSession} logs={[]} />)

    // Title is: Execution #{session.id.slice(0, 8)}
    expect(screen.getByText(/Execution #session-/)).toBeInTheDocument()
    
    expect(screen.getByText('completed')).toBeInTheDocument()
    
    // Check if sub-components are rendered
    // The component renders "No logs available" if logs empty
    expect(screen.getByText('No logs available')).toBeInTheDocument()
  })

  it('shows empty state when no session selected', () => {
    render(<ExecutionDetailPanel session={null} logs={[]} />)

    expect(screen.getByText('Select an execution to view details')).toBeInTheDocument()
  })
})
