import type { SkillFile } from '@/types'

interface FilePreviewProps {
  file: SkillFile | null
  isLoading?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function getLanguage(_fileType: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()

  const languageMap: Record<string, string> = {
    md: 'markdown',
    markdown: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    json: 'json',
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    html: 'html',
    css: 'css',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    xml: 'xml',
  }

  return languageMap[ext || ''] || 'text'
}

export function FilePreview({ file, isLoading }: FilePreviewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!file) {
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm">Select a file to preview</p>
      </div>
    )
  }

  if (file.is_binary) {
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
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-sm font-medium">Binary file - cannot preview</p>
        <p className="text-xs mt-1">Size: {formatBytes(file.size_bytes)}</p>
      </div>
    )
  }

  const language = getLanguage(file.file_type, file.name)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{file.path}</span>
          {file.is_modified && (
            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded">
              Modified
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatBytes(file.size_bytes)}
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="p-4 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
          <code className={`language-${language}`}>{file.content || ''}</code>
        </pre>
      </div>
    </div>
  )
}
