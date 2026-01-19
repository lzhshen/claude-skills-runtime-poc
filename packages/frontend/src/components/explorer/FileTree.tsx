import type { SkillFile } from '@/types'
import clsx from 'clsx'

interface FileTreeProps {
  files: SkillFile[]
  selectedPath: string | null
  onSelect: (path: string) => void
  level?: number
}

function getFileIcon(fileType: string, isExpanded?: boolean): JSX.Element {
  if (fileType === 'directory') {
    return isExpanded ? (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H2V6zm0 3h16v5a2 2 0 01-2 2H4a2 2 0 01-2-2V9z"
          clipRule="evenodd"
        />
      </svg>
    ) : (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    )
  }

  // File icon based on type
  const iconColor =
    fileType === 'markdown'
      ? 'text-anthropic-blue'
      : fileType === 'yaml'
        ? 'text-anthropic-terracotta'
        : fileType === 'binary'
          ? 'text-anthropic-midgray'
          : 'text-anthropic-charcoal/60'

  return (
    <svg className={clsx('h-4 w-4', iconColor)} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function FileTree({ files, selectedPath, onSelect, level = 0 }: FileTreeProps) {
  return (
    <div className={clsx('space-y-0.5', level > 0 && 'ml-4')}>
      {files &&
        files.map((file) => (
          <FileTreeNode
            key={file.path}
            file={file}
            isSelected={selectedPath === file.path}
            onSelect={onSelect}
            level={level}
          />
        ))}
    </div>
  )
}

interface FileTreeNodeProps {
  file: SkillFile
  isSelected: boolean
  onSelect: (path: string) => void
  level: number
}

function FileTreeNode({ file, isSelected, onSelect, level }: FileTreeNodeProps) {
  const isDirectory = file.file_type === 'directory'
  const hasChildren = file.children && file.children.length > 0

  const handleClick = () => {
    if (!isDirectory) {
      onSelect(file.path)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={clsx(
          'w-full flex items-center gap-2 px-2 py-1 rounded text-left text-sm font-body transition-colors',
          isSelected
            ? 'bg-anthropic-stone/50 dark:bg-primary-900/30 text-anthropic-charcoal dark:text-primary-300'
            : 'hover:bg-anthropic-stone/20 dark:hover:bg-gray-700 text-anthropic-charcoal dark:text-gray-300',
          isDirectory && 'font-heading font-medium'
        )}
        disabled={isDirectory}
      >
        <span className="flex-shrink-0 text-anthropic-midgray dark:text-gray-500">
          {getFileIcon(file.file_type)}
        </span>
        <span className="truncate">{file.name}</span>
        {file.is_modified && (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-anthropic-terracotta" title="Modified" />
        )}
        {file.is_binary && (
          <span className="text-xs text-anthropic-midgray dark:text-gray-500">(binary)</span>
        )}
      </button>

      {isDirectory && hasChildren && (
        <FileTree
          files={file.children || []}
          selectedPath={null}
          onSelect={onSelect}
          level={level + 1}
        />
      )}
    </div>
  )
}
