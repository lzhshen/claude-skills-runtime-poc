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
    debugMode,
    setPrompt,
    setSelectedProvider,
    setSelectedModel,
    setDebugMode,
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
        <h2 className="text-lg font-heading font-medium text-anthropic-charcoal dark:text-white">Run Skill</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-body text-anthropic-charcoal/60 dark:text-gray-400">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
              className="rounded border-anthropic-stone text-anthropic-terracotta focus:ring-anthropic-terracotta"
              disabled={isRunning}
            />
            Debug mode
          </label>
          {logs.length > 0 && status !== 'running' && (
            <button
              onClick={clearLogs}
              className="text-sm font-body text-anthropic-midgray hover:text-anthropic-charcoal dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Clear logs
            </button>
          )}
        </div>
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
      <div className="border-t border-anthropic-stone/30 dark:border-gray-700 pt-6">
        <ExecutionProgress logs={logs} status={status} error={error} />
      </div>
    </div>
  )
}
