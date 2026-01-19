interface CancelButtonProps {
  onClick: () => void
  disabled?: boolean
}

export function CancelButton({ onClick, disabled = false }: CancelButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-heading font-medium text-anthropic-charcoal dark:text-red-400 bg-white border border-anthropic-stone dark:bg-red-900/20 dark:border-red-800 rounded-lg hover:bg-anthropic-stone/20 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-anthropic-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
      Cancel
    </button>
  )
}
