import clsx from 'clsx'

interface EditorToolbarProps {
  hasChanges: boolean
  isSaving: boolean
  onSave: () => void
  onRevert: () => void
  onDownload: () => void
  isDownloading?: boolean
}

export function EditorToolbar({
  hasChanges,
  isSaving,
  onSave,
  onRevert,
  onDownload,
  isDownloading = false,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        {/* Save button */}
        <button
          onClick={onSave}
          disabled={!hasChanges || isSaving}
          className={clsx(
            'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            hasChanges && !isSaving
              ? 'bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
          )}
        >
          {isSaving ? (
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
              Saving...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              Save
            </>
          )}
        </button>

        {/* Revert button */}
        <button
          onClick={onRevert}
          disabled={!hasChanges || isSaving}
          className={clsx(
            'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            hasChanges && !isSaving
              ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
          )}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Revert
        </button>

        {/* Unsaved changes indicator */}
        {hasChanges && (
          <span className="text-sm text-yellow-600 dark:text-yellow-400">
            • Unsaved changes
          </span>
        )}
      </div>

      {/* Download button */}
      <button
        onClick={onDownload}
        disabled={isDownloading}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDownloading ? (
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
            Downloading...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download ZIP
          </>
        )}
      </button>
    </div>
  )
}
