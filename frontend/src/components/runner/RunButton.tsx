import clsx from 'clsx'

interface RunButtonProps {
  onClick: () => void
  disabled?: boolean
  isRunning?: boolean
}

export function RunButton({ onClick, disabled = false, isRunning = false }: RunButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isRunning}
      className={clsx(
        'inline-flex items-center gap-2 px-6 py-2.5 text-sm font-heading font-medium rounded-lg transition-all',
        isRunning
          ? 'bg-anthropic-terracotta/80 text-white cursor-wait'
          : disabled
            ? 'bg-anthropic-stone text-anthropic-midgray dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
            : 'bg-anthropic-terracotta text-white hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-anthropic-terracotta shadow-sm hover:shadow'
      )}
    >
      {isRunning ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
          Running...
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Run Skill
        </>
      )}
    </button>
  )
}
