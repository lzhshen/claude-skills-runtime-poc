import { useCallback, useState, useRef } from 'react'
import { useSkillUpload } from '@/hooks/useSkillUpload'
import clsx from 'clsx'

interface UploadZoneProps {
  onUploadComplete?: () => void
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const { upload, isUploading, error, clearError } = useSkillUpload()
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      clearError()

      const files = Array.from(e.dataTransfer.files)
      const zipFile = files.find((f) => f.name.toLowerCase().endsWith('.zip'))

      if (zipFile) {
        const result = await upload(zipFile)
        if (result && onUploadComplete) {
          onUploadComplete()
        }
      }
    },
    [upload, clearError, onUploadComplete]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      clearError()
      const file = e.target.files?.[0]
      if (file) {
        const result = await upload(file)
        if (result && onUploadComplete) {
          onUploadComplete()
        }
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [upload, clearError, onUploadComplete]
  )

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div
      className={clsx(
        'relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
        isDragging
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
        isUploading && 'pointer-events-none opacity-50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      <div className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500">
        {isUploading ? (
          <svg
            className="animate-spin"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
            />
          </svg>
        )}
      </div>

      <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        {isUploading ? 'Uploading...' : 'Upload Skill Package'}
      </h3>

      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {isDragging
          ? 'Drop your .zip file here'
          : 'Drag and drop a .zip file, or click to browse'}
      </p>

      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Maximum file size: 10MB</p>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
