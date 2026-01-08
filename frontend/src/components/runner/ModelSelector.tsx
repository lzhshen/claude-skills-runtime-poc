import type { Provider } from '@/types'

interface ModelSelectorProps {
  providers: Provider[]
  selectedProvider: string
  selectedModel: string
  onProviderChange: (provider: string) => void
  onModelChange: (model: string) => void
  disabled?: boolean
}

export function ModelSelector({
  providers,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  disabled = false,
}: ModelSelectorProps) {
  const currentProvider = providers.find((p) => p.id === selectedProvider)
  const models = currentProvider?.models || []

  return (
    <div className="flex items-center gap-4">
      {/* Provider selector */}
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Provider
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => onProviderChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
      </div>

      {/* Model selector */}
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled || models.length === 0}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
