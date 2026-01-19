import { render, screen, fireEvent } from '@testing-library/react'
import { ExecutionHistoryList } from '@/components/logs/ExecutionHistoryList'
import { describe, it, expect, vi } from 'vitest'
import type { ExecutionSession } from '@/types'

const mockSessions: ExecutionSession[] = [
  {
    id: '12345678-session-1',
    skill_package_id: 'skill-1',
    skill_name: 'Test Skill',
    user_prompt: 'Run 1',
    status: 'completed',
    started_at: '2023-01-01T10:00:00Z',
    ended_at: '2023-01-01T10:00:05Z',
    logs: []
  },
  {
    id: '87654321-session-2',
    skill_package_id: 'skill-1',
    skill_name: 'Test Skill',
    user_prompt: 'Run 2',
    status: 'failed',
    started_at: '2023-01-01T11:00:00Z',
    ended_at: '2023-01-01T11:00:02Z',
    logs: []
  }
]

describe('ExecutionHistoryList', () => {
  it('renders session list', () => {
    const onSelect = vi.fn()
    render(
      <ExecutionHistoryList 
        sessions={mockSessions} 
        selectedId={null} 
        onSelect={onSelect} 
      />
    )

    // The component truncates ID: {session.id.slice(0, 8)}...
    expect(screen.getByText('12345678...')).toBeInTheDocument()
    expect(screen.getByText('87654321...')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('failed')).toBeInTheDocument()
  })

  it('handles selection', () => {
    const onSelect = vi.fn()
    render(
      <ExecutionHistoryList 
        sessions={mockSessions} 
        selectedId={null} 
        onSelect={onSelect} 
      />
    )

    fireEvent.click(screen.getByText('12345678...'))
    expect(onSelect).toHaveBeenCalledWith('12345678-session-1')
  })

  it('highlights selected session', () => {
    const onSelect = vi.fn()
    render(
      <ExecutionHistoryList 
        sessions={mockSessions} 
        selectedId="12345678-session-1" 
        onSelect={onSelect} 
      />
    )

    const selectedButton = screen.getByText('12345678...').closest('button')
    expect(selectedButton).toHaveClass('border-anthropic-terracotta')
  })

  it('shows empty state', () => {
    render(
      <ExecutionHistoryList 
        sessions={[]} 
        selectedId={null} 
        onSelect={vi.fn()} 
      />
    )

    expect(screen.getByText('No executions yet')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    const { container } = render(
      <ExecutionHistoryList 
        sessions={[]} 
        selectedId={null} 
        onSelect={vi.fn()} 
        isLoading={true}
      />
    )

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })
})
