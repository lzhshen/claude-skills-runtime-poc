import type { ExecutionError } from '@/types'

interface ErrorDisplayProps {
  error: ExecutionError | null
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) {
    return null
  }

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
            Error: {error.code}
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
            {error.message}
          </p>
          {error.stack_trace && (
            <details className="mt-3">
              <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:underline">
                Show stack trace
              </summary>
              <pre className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs font-mono text-red-800 dark:text-red-300 overflow-auto max-h-48">
                {error.stack_trace}
              </pre>
            </details>
          )}
          {error.occurred_at && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-500">
              Occurred at: {new Date(error.occurred_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
