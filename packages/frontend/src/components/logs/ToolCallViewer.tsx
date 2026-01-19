import type { ToolCall } from '@/types'
import clsx from 'clsx'

interface ToolCallViewerProps {
  toolCalls: ToolCall[]
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'bg-anthropic-green/10 text-anthropic-green dark:bg-green-900/30 dark:text-green-300'
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case 'running':
      return 'bg-anthropic-terracotta/10 text-anthropic-terracotta dark:bg-yellow-900/30 dark:text-yellow-300'
    default:
      return 'bg-anthropic-stone/30 text-anthropic-charcoal/80 dark:bg-gray-700 dark:text-gray-300'
  }
}

function getStatusIcon(status: string): JSX.Element {
  switch (status) {
    case 'success':
      return (
        <svg
          className="h-4 w-4 text-anthropic-green"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    case 'failed':
      return (
        <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )
    case 'running':
      return (
        <svg className="animate-spin h-4 w-4 text-anthropic-terracotta" fill="none" viewBox="0 0 24 24">
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
      )
    default:
      return (
        <svg
          className="h-4 w-4 text-anthropic-midgray"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
  }
}

export function ToolCallViewer({ toolCalls }: ToolCallViewerProps) {
  if (toolCalls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-anthropic-midgray dark:text-gray-400">
        <svg className="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-sm font-body">No tool calls in this execution</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {toolCalls.map((toolCall, index) => (
        <div
          key={toolCall.id || index}
          className="border border-anthropic-stone/50 dark:border-gray-700 rounded-lg overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-anthropic-stone/20 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-anthropic-terracotta"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
              <span className="font-heading font-medium text-anthropic-charcoal dark:text-white">{toolCall.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(toolCall.status)}
              <span
                className={clsx(
                  'px-2 py-0.5 text-xs font-heading font-medium rounded-full',
                  getStatusColor(toolCall.status)
                )}
              >
                {toolCall.status}
              </span>
            </div>
          </div>

          {/* Arguments */}
          <div className="p-4 border-t border-anthropic-stone/50 dark:border-gray-700">
            <h4 className="text-xs font-heading font-medium text-anthropic-charcoal/60 dark:text-gray-400 uppercase mb-2">
              Arguments
            </h4>
            <pre className="text-sm text-anthropic-charcoal dark:text-gray-300 bg-anthropic-stone/20 dark:bg-gray-800 p-3 rounded overflow-auto max-h-40 font-mono">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {/* Result (if available) */}
          {toolCall.result && (
            <div className="p-4 border-t border-anthropic-stone/50 dark:border-gray-700">
              <h4 className="text-xs font-heading font-medium text-anthropic-charcoal/60 dark:text-gray-400 uppercase mb-2">
                Result
              </h4>
              <pre className="text-sm text-anthropic-charcoal dark:text-gray-300 bg-anthropic-stone/20 dark:bg-gray-800 p-3 rounded overflow-auto max-h-40 font-mono">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
