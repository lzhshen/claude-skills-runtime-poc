import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import type { SkillFile } from '@/types'

interface CodeEditorProps {
  file: SkillFile | null
  value: string
  onChange: (value: string) => void
  isReadOnly?: boolean
}

function getLanguage(fileName: string): string {
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
    sh: 'shell',
    bash: 'shell',
    xml: 'xml',
  }

  return languageMap[ext || ''] || 'plaintext'
}

export function CodeEditor({ file, value, onChange, isReadOnly = false }: CodeEditorProps) {
  // Simple theme detection (could be improved with a hook)
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('light')

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('vs-dark')
    }
  }, [])

  if (!file) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <p className="text-sm">Select a file to edit</p>
        </div>
      </div>
    )
  }

  if (file.is_binary) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 mb-4"
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
          <p className="text-sm font-medium">Binary file - cannot edit</p>
        </div>
      </div>
    )
  }

  const language = getLanguage(file.name)

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Editor header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{file.path}</span>
          <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
            {language}
          </span>
        </div>
        {isReadOnly && (
          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded">
            Read Only
          </span>
        )}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={value}
          theme={theme}
          onChange={(val) => onChange(val || '')}
          options={{
            readOnly: isReadOnly,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>
    </div>
  )
}
