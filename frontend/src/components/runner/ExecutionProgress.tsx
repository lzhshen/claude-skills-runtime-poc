import type { ExecutionLog } from '@/types'
import clsx from 'clsx'

interface ExecutionProgressProps {
  logs: ExecutionLog[]
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'
  error?: string | null
}

function getLogIcon(type: string): JSX.Element {
  switch (type) {
    case 'message':
      return (
        <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      )
    case 'tool_call':
      return (
        <svg className="h-4 w-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      )
    case 'tool_result':
      return (
        <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    case 'error':
      return (
        <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    default:
      return (
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
  }
}

function formatContent(content: Record<string, unknown>): string {
  if (content.content && typeof content.content === 'string') {
    return content.content
  }
  if (content.name && typeof content.name === 'string') {
    return `Tool: ${content.name}`
  }
  if (content.result && typeof content.result === 'string') {
    return content.result.slice(0, 200) + (content.result.length > 200 ? '...' : '')
  }
  return JSON.stringify(content, null, 2).slice(0, 200)
}

export function ExecutionProgress({ logs, status, error }: ExecutionProgressProps) {
  if (status === 'idle' && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <svg
          className="h-12 w-12 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm">Enter a prompt and click Run to execute the skill</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Status indicator */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div
          className={clsx(
            'w-2 h-2 rounded-full',
            status === 'running' && 'bg-yellow-500 animate-pulse',
            status === 'completed' && 'bg-green-500',
            status === 'failed' && 'bg-red-500',
            status === 'cancelled' && 'bg-gray-500',
            status === 'idle' && 'bg-gray-400'
          )}
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
          {status}
        </span>
        {status === 'running' && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({logs.length} events)
          </span>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Logs */}
      <div className="space-y-2 max-h-96 overflow-auto">
        {logs.map((log, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <div className="flex-shrink-0 mt-0.5">{getLogIcon(log.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {log.type.replace('_', ' ')}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono">
                {formatContent(log.content)}
              </pre>
            </div>
          </div>
        ))}

        {/* Running indicator */}
        {status === 'running' && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <svg className="animate-spin h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              Executing...
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
