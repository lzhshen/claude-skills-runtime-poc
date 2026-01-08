interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Enter your prompt...',
}: PromptInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={4}
        className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500">
        Press ⌘+Enter to run
      </div>
    </div>
  )
}
