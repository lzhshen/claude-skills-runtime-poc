import { useEffect, useState, useCallback } from 'react'
import { useAppState } from '@/hooks/useAppState'
import { useFileExplorer } from '@/hooks/useFileExplorer'
import { useFileEditor } from '@/hooks/useFileEditor'
import { useExecutionLogs } from '@/hooks/useExecutionLogs'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { UploadZone } from '@/components/upload/UploadZone'
import { ValidationResult } from '@/components/upload/ValidationResult'
import { SkillMetadataCard } from '@/components/upload/SkillMetadataCard'
import { FileTree } from '@/components/explorer/FileTree'
import { CodeEditor } from '@/components/editor/CodeEditor'
import { EditorToolbar } from '@/components/editor/EditorToolbar'
import { SkillRunner } from '@/components/runner/SkillRunner'
import { ExecutionHistoryList } from '@/components/logs/ExecutionHistoryList'
import { ExecutionDetailPanel } from '@/components/logs/ExecutionDetailPanel'
import { getDownloadUrl } from '@/services/skillsApi'

type ActiveTab = 'editor' | 'runner' | 'history'

function MainPage() {
  const { currentSkill, setCurrentSkill, selectedFilePath } = useAppState()
  const {
    fileTree,
    selectedFile,
    isLoading: isFileLoading,
    error: fileError,
    loadFileTree,
    selectFile,
  } = useFileExplorer()

  const {
    editedContent,
    hasChanges,
    isSaving,
    error: editorError,
    setEditedContent,
    saveChanges,
    revertChanges,
    loadFile,
  } = useFileEditor()

  const {
    sessions,
    selectedSession,
    logs: executionLogs,
    isLoading: isLogsLoading,
    error: logsError,
    loadSessions,
    selectSession,
  } = useExecutionLogs()

  const [isDownloading, setIsDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor')

  // Warn user about unsaved changes before leaving
  useUnsavedChangesWarning({ hasChanges })

  // Load file tree when a skill is loaded
  useEffect(() => {
    if (currentSkill) {
      loadFileTree()
    }
  }, [currentSkill, loadFileTree])

  // Load file into editor when selected
  useEffect(() => {
    if (selectedFile && !selectedFile.is_binary) {
      loadFile(selectedFile)
    }
  }, [selectedFile, loadFile])

  const handleReset = () => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to upload a new skill?')
      if (!confirmed) return
    }
    setCurrentSkill(null)
  }

  const handleDownload = useCallback(() => {
    if (!currentSkill) return

    setIsDownloading(true)

    // Create a temporary link to trigger download
    const downloadUrl = getDownloadUrl(currentSkill.id)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${currentSkill.original_filename.replace('.zip', '')}_modified.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Reset downloading state after a short delay
    setTimeout(() => setIsDownloading(false), 1000)
  }, [currentSkill])

  const handleSave = async () => {
    const success = await saveChanges()
    if (success) {
      // Reload file tree to reflect changes
      loadFileTree()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Claude Skills Runtime
          </h1>
          {currentSkill && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Upload New Skill
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {!currentSkill ? (
          <div className="max-w-2xl mx-auto">
            <UploadZone />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Validation Result */}
            <ValidationResult
              status={currentSkill.validation_status}
              errors={currentSkill.validation_errors}
            />

            {/* Skill Metadata (if valid) */}
            {currentSkill.validation_status === 'valid' && currentSkill.metadata && (
              <SkillMetadataCard
                metadata={currentSkill.metadata}
                filename={currentSkill.original_filename}
                sizeBytes={currentSkill.size_bytes}
              />
            )}

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'editor'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setActiveTab('runner')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'runner'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  Run Skill
                </button>
                <button
                  onClick={() => {
                    setActiveTab('history')
                    loadSessions()
                  }}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'history'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  History
                </button>
              </nav>
            </div>

            {/* Editor Tab */}
            {activeTab === 'editor' && (
              <>
                {/* Editor Toolbar */}
                <EditorToolbar
                  hasChanges={hasChanges}
                  isSaving={isSaving}
                  onSave={handleSave}
                  onRevert={revertChanges}
                  onDownload={handleDownload}
                  isDownloading={isDownloading}
                />

                {/* Error display */}
                {(fileError || editorError) && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {fileError || editorError}
                    </p>
                  </div>
                )}

                {/* File Explorer and Editor Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* File Tree */}
                  <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                        File Explorer
                      </h2>
                    </div>
                    <div className="p-4 max-h-[600px] overflow-auto">
                      {fileTree ? (
                        <FileTree
                          files={fileTree.tree}
                          selectedPath={selectedFilePath}
                          onSelect={selectFile}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-32">
                          <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Code Editor */}
                  <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                        Editor
                      </h2>
                      {hasChanges && (
                        <span className="text-sm text-yellow-600 dark:text-yellow-400">
                          • Unsaved changes
                        </span>
                      )}
                    </div>
                    <div className="h-[600px] overflow-auto">
                      {isFileLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                        </div>
                      ) : (
                        <CodeEditor
                          file={selectedFile}
                          value={editedContent}
                          onChange={setEditedContent}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Runner Tab */}
            {activeTab === 'runner' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <SkillRunner />
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Execution History List */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                      Execution History
                    </h2>
                  </div>
                  <div className="p-4 max-h-[600px] overflow-auto">
                    {logsError ? (
                      <div className="p-4 text-red-600 dark:text-red-400 text-sm">
                        {logsError}
                      </div>
                    ) : (
                      <ExecutionHistoryList
                        sessions={sessions}
                        selectedId={selectedSession?.id || null}
                        onSelect={selectSession}
                        isLoading={isLogsLoading}
                      />
                    )}
                  </div>
                </div>

                {/* Execution Detail Panel */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <ExecutionDetailPanel
                    session={selectedSession}
                    logs={executionLogs}
                    isLoading={isLogsLoading}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default MainPage
