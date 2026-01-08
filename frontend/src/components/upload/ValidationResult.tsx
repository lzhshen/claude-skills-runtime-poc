import type { ValidationError, ValidationStatus } from '@/types'
import clsx from 'clsx'

interface ValidationResultProps {
  status: ValidationStatus
  errors: ValidationError[]
}

export function ValidationResult({ status, errors }: ValidationResultProps) {
  const isValid = status === 'valid'
  const isInvalid = status === 'invalid'
  const isPending = status === 'pending'

  return (
    <div
      className={clsx(
        'rounded-lg p-4',
        isValid && 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800',
        isInvalid && 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
        isPending && 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
      )}
    >
      <div className="flex items-center gap-2">
        {isValid && (
          <>
            <svg
              className="h-5 w-5 text-green-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-green-800 dark:text-green-200">
              Validation Passed
            </span>
          </>
        )}

        {isInvalid && (
          <>
            <svg
              className="h-5 w-5 text-red-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-red-800 dark:text-red-200">Validation Failed</span>
          </>
        )}

        {isPending && (
          <>
            <svg
              className="h-5 w-5 text-yellow-500 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="font-medium text-yellow-800 dark:text-yellow-200">Validating...</span>
          </>
        )}
      </div>

      {isInvalid && errors.length > 0 && (
        <div className="mt-3 space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="p-3 bg-white dark:bg-gray-800 rounded border border-red-100 dark:border-red-900"
            >
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  {error.code}
                </span>
                {error.field && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    {error.field}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{error.message}</p>
              {error.suggestion && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Suggestion: {error.suggestion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
