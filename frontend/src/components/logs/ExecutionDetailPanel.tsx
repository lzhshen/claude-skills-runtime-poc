import { useState } from 'react'
import type { ExecutionSession, ExecutionLog } from '@/types'
import { ErrorDisplay } from './ErrorDisplay'
import clsx from 'clsx'

interface ExecutionDetailPanelProps {
  session: ExecutionSession | null
  logs: ExecutionLog[]
  isLoading?: boolean
}

type DetailTab = 'logs' | 'result' | 'details'

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-green-600 dark:text-green-400'
    case 'failed':
      return 'text-red-600 dark:text-red-400'
    case 'running':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'cancelled':
      return 'text-gray-600 dark:text-gray-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
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
        </svg>
      )
    case 'tool_result':
      return (
        <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'error':
      return (
        <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    default:
      return (
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  return JSON.stringify(content, null, 2)
}

export function ExecutionDetailPanel({
  session,
  logs,
  isLoading = false,
}: ExecutionDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('logs')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!session) {
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm">Select an execution to view details</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Execution #{session.id.slice(0, 8)}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(session.started_at).toLocaleString()}
            </p>
          </div>
          <span className={clsx('text-sm font-medium capitalize', getStatusColor(session.status))}>
            {session.status}
          </span>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px">
          {(['logs', 'result', 'details'] as DetailTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize',
                activeTab === tab
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'logs' && (
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No logs available
              </p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
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
              ))
            )}
          </div>
        )}

        {activeTab === 'result' && (
          <div>
            {session.error ? (
              <ErrorDisplay error={session.error} />
            ) : session.result ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Response
                  </h4>
                  <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                    {session.result.response}
                  </pre>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>Tool calls: {session.result.tool_calls_count}</span>
                  <span>Messages: {session.result.messages?.length || 0}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No result available
              </p>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Session ID
                </h4>
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {session.id}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Status
                </h4>
                <p className={clsx('text-sm font-medium capitalize', getStatusColor(session.status))}>
                  {session.status}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Started At
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {new Date(session.started_at).toLocaleString()}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Ended At
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {session.ended_at ? new Date(session.ended_at).toLocaleString() : 'N/A'}
                </p>
              </div>
              {session.duration_ms && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Duration
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {session.duration_ms}ms
                  </p>
                </div>
              )}
              {session.model && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Model
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {session.model.provider_id}/{session.model.model_id}
                  </p>
                </div>
              )}
            </div>
            {session.user_prompt && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  User Prompt
                </h4>
                <pre className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {session.user_prompt}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
