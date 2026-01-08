import type { SkillMetadata } from '@/types'

interface SkillMetadataCardProps {
  metadata: SkillMetadata
  filename: string
  sizeBytes: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function SkillMetadataCard({ metadata, filename, sizeBytes }: SkillMetadataCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{metadata.name}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{metadata.description}</p>
        </div>
        <div className="flex-shrink-0">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Valid
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Filename</dt>
          <dd className="mt-1 text-gray-900 dark:text-white font-mono text-xs">{filename}</dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Size</dt>
          <dd className="mt-1 text-gray-900 dark:text-white">{formatBytes(sizeBytes)}</dd>
        </div>
      </div>

      {Object.keys(metadata.extra_fields).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Additional Metadata
          </h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(metadata.extra_fields).map(([key, value]) => (
              <div key={key}>
                <dt className="text-gray-500 dark:text-gray-400">{key}</dt>
                <dd className="text-gray-900 dark:text-white">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {metadata.instruction && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Instructions Preview
          </h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 max-h-32 overflow-y-auto">
            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {metadata.instruction.slice(0, 500)}
              {metadata.instruction.length > 500 && '...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
