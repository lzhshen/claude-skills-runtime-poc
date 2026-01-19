import type { ExecutionSession } from '@/types'
import clsx from 'clsx'

interface ExecutionHistoryListProps {
  sessions: ExecutionSession[]
  selectedId: string | null
  onSelect: (sessionId: string) => void
  isLoading?: boolean
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-anthropic-green/10 text-anthropic-green dark:bg-green-900/30 dark:text-green-300'
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case 'running':
      return 'bg-anthropic-blue/10 text-anthropic-blue dark:bg-yellow-900/30 dark:text-yellow-300'
    case 'cancelled':
      return 'bg-anthropic-midgray/20 text-anthropic-midgray dark:bg-gray-700 dark:text-gray-300'
    default:
      return 'bg-anthropic-stone/30 text-anthropic-charcoal/80 dark:bg-gray-700 dark:text-gray-300'
  }
}

function formatDuration(startedAt: string, endedAt?: string): string {
  if (!endedAt) return 'In progress...'

  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()
  const durationMs = end - start

  if (durationMs < 1000) return `${durationMs}ms`
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`
  return `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`
}

export function ExecutionHistoryList({
  sessions,
  selectedId,
  onSelect,
  isLoading = false,
}: ExecutionHistoryListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-anthropic-midgray dark:text-gray-400">
        <svg className="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm font-body">No executions yet</p>
        <p className="text-xs mt-1 font-body">Run the skill to see execution history</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelect(session.id)}
          className={clsx(
            'w-full text-left p-3 rounded-lg border transition-colors',
            selectedId === session.id
              ? 'border-anthropic-terracotta bg-anthropic-stone/30 dark:bg-primary-900/20'
              : 'border-anthropic-stone/50 dark:border-gray-700 hover:bg-anthropic-stone/20 dark:hover:bg-gray-800'
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-anthropic-charcoal/60 dark:text-gray-400">
              {session.id.slice(0, 8)}...
            </span>
            <span
              className={clsx('px-2 py-0.5 text-xs font-heading font-medium rounded-full', getStatusColor(session.status))}
            >
              {session.status}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-body text-anthropic-charcoal/70 dark:text-gray-400">
            <span>{new Date(session.started_at).toLocaleString()}</span>
            <span>{formatDuration(session.started_at, session.ended_at)}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
