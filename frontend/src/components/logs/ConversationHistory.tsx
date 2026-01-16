import type { Message } from '@/types'
import clsx from 'clsx'

interface ConversationHistoryProps {
  messages: Message[]
}

function getRoleColor(role: string): string {
  switch (role) {
    case 'user':
      return 'bg-anthropic-stone/20 dark:bg-blue-900/20 border-anthropic-stone dark:border-blue-800'
    case 'assistant':
      return 'bg-anthropic-cream dark:bg-green-900/20 border-anthropic-stone/50 dark:border-green-800'
    case 'system':
      return 'bg-anthropic-stone/10 dark:bg-gray-800 border-anthropic-stone/30 dark:border-gray-700'
    default:
      return 'bg-anthropic-stone/10 dark:bg-gray-800 border-anthropic-stone/30 dark:border-gray-700'
  }
}

function getRoleIcon(role: string): JSX.Element {
  switch (role) {
    case 'user':
      return (
        <svg
          className="h-5 w-5 text-anthropic-charcoal"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      )
    case 'assistant':
      return (
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
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      )
    default:
      return (
        <svg
          className="h-5 w-5 text-anthropic-midgray"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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

export function ConversationHistory({ messages }: ConversationHistoryProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-anthropic-midgray dark:text-gray-400">
        <svg className="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="text-sm font-body">No messages in this conversation</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div key={index} className={clsx('p-4 rounded-lg border', getRoleColor(message.role))}>
          <div className="flex items-center gap-2 mb-2">
            {getRoleIcon(message.role)}
            <span className="text-sm font-heading font-medium capitalize text-anthropic-charcoal dark:text-gray-300">
              {message.role}
            </span>
            <span className="text-xs font-mono text-anthropic-midgray dark:text-gray-500">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-anthropic-charcoal dark:text-gray-300 font-mono">
              {message.content}
            </pre>
          </div>
        </div>
      ))}
    </div>
  )
}
