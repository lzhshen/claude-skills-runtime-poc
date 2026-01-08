import { useSkillExecution } from '@/hooks/useSkillExecution'
import { PromptInput } from './PromptInput'
import { ModelSelector } from './ModelSelector'
import { RunButton } from './RunButton'
import { CancelButton } from './CancelButton'
import { ExecutionProgress } from './ExecutionProgress'

export function SkillRunner() {
  const {
    status,
    logs,
    error,
    providers,
    selectedProvider,
    selectedModel,
    prompt,
    setPrompt,
    setSelectedProvider,
    setSelectedModel,
    startExecution,
    cancelCurrentExecution,
    clearLogs,
  } = useSkillExecution()

  const isRunning = status === 'running'
  const canRun = prompt.trim().length > 0 && !isRunning

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Run Skill
        </h2>
        {logs.length > 0 && status !== 'running' && (
          <button
            onClick={clearLogs}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Clear logs
          </button>
        )}
      </div>

      {/* Model selector */}
      <ModelSelector
        providers={providers}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        onProviderChange={setSelectedProvider}
        onModelChange={setSelectedModel}
        disabled={isRunning}
      />

      {/* Prompt input */}
      <PromptInput
        value={prompt}
        onChange={setPrompt}
        onSubmit={startExecution}
        disabled={isRunning}
        placeholder="Enter your prompt to run the skill..."
      />

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <RunButton onClick={startExecution} disabled={!canRun} isRunning={isRunning} />
        {isRunning && <CancelButton onClick={cancelCurrentExecution} />}
      </div>

      {/* Execution progress */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <ExecutionProgress logs={logs} status={status} error={error} />
      </div>
    </div>
  )
}
