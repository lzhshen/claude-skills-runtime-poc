# Feature Specification: Claude Skills Runtime Framework and Test Web App

**Feature Branch**: `001-skills-runtime`
**Created**: 2026-01-06
**Status**: Draft
**Input**: User description: "为 claude skills(https://github.com/anthropics/skills) 智能体实现一个运行时框架和测试web app，web app 支持 claude skills zip 包上传、内容检验（必须符合 claude skills 规范）、目录树和文件内容预览、内容修改和重新打包；claude skill 运行、运行日志和结果查看等；claude skills 运行时框架是核心，可以基于开源的框架（比如业界成熟的智能体框架上开发，这个技术方案是关键，需要深入调研），保证其运行效果不弱于 claude code, 同时不能引入不必要的复杂度"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload and Validate Skill Package (Priority: P1)

A developer wants to test a Claude Skill they created by uploading it to the web app for validation and execution.

**Why this priority**: This is the fundamental entry point for the entire system. Without the ability to upload and validate skill packages, no other functionality can work. It enables the core use case of testing skills before deployment.

**Independent Test**: Can be fully tested by uploading various skill packages (valid and invalid) and verifying validation feedback. Delivers immediate value by catching specification errors early.

**Acceptance Scenarios**:

1. **Given** a developer has a valid skill package (zip file with SKILL.md and proper structure), **When** they upload it through the web interface, **Then** the system validates the package and displays a success message with the skill name and description extracted from the YAML frontmatter.

2. **Given** a developer uploads a skill package missing the SKILL.md file, **When** the upload completes, **Then** the system displays a clear error message indicating "SKILL.md file is required" with guidance on the expected structure.

3. **Given** a developer uploads a skill package with invalid YAML frontmatter (missing name or description), **When** the upload completes, **Then** the system displays specific validation errors indicating which required fields are missing.

4. **Given** a developer uploads a file that is not a valid zip archive, **When** the upload is attempted, **Then** the system rejects the upload with an appropriate error message before processing.

---

### User Story 2 - Execute Skill and View Results (Priority: P1)

A developer wants to run a skill against a test prompt and see the execution results, including logs and outputs.

**Why this priority**: This is the second core use case after upload. Developers need to verify that their skills work correctly with real LLM interactions before deployment.

**Independent Test**: Can be fully tested by running a skill with test input and observing logs and outputs. Delivers the primary value of skill testing.

**Acceptance Scenarios**:

1. **Given** a validated skill is loaded, **When** the developer enters a test prompt and clicks "Run", **Then** the skill execution begins and a real-time log stream displays progress.

2. **Given** a skill is executing, **When** execution completes successfully, **Then** the final output is displayed prominently along with execution statistics (duration, token usage).

3. **Given** a skill is executing, **When** an error occurs during execution, **Then** the error is displayed clearly with relevant context from the execution log.

4. **Given** a skill is executing, **When** the developer clicks "Stop", **Then** execution is terminated gracefully and the partial log is preserved.

5. **Given** execution has completed (success or failure), **When** the developer views the results, **Then** they can see the complete execution log, input prompt, and any generated outputs.

---

### User Story 3 - Browse and Preview Skill Contents (Priority: P2)

A developer wants to explore the contents of an uploaded skill package to understand its structure and review individual files.

**Why this priority**: After upload and validation, developers need to inspect the contents before running the skill. This builds confidence and allows identification of issues before execution.

**Independent Test**: Can be fully tested by uploading a skill package and navigating through its directory tree, opening various files. Delivers value by providing visibility into skill structure.

**Acceptance Scenarios**:

1. **Given** a validated skill package is loaded, **When** the developer views the skill details page, **Then** a hierarchical directory tree displays all files and folders within the package.

2. **Given** a directory tree is displayed, **When** the developer clicks on a file, **Then** the file content is displayed in a syntax-highlighted viewer appropriate for the file type (markdown, code, etc.).

3. **Given** a directory tree is displayed, **When** the developer expands a folder, **Then** the folder contents are revealed without page reload.

---

### User Story 4 - Edit and Repackage Skills (Priority: P3)

A developer wants to make modifications to skill files directly in the web interface and download an updated package.

**Why this priority**: This enables rapid iteration without leaving the web app. Developers can fix issues found during validation or testing without external tools.

**Independent Test**: Can be fully tested by editing a file, saving changes, and downloading the repackaged skill. Delivers value by enabling in-browser skill development workflow.

**Acceptance Scenarios**:

1. **Given** a file is displayed in the viewer, **When** the developer clicks an "Edit" button, **Then** the viewer transforms into an editable text area with the current content.

2. **Given** a file is being edited, **When** the developer saves changes, **Then** the changes are persisted in the current session and validation is re-run automatically.

3. **Given** modifications have been made to one or more files, **When** the developer clicks "Download Package", **Then** a new zip file is generated containing all current files with changes applied.

4. **Given** edits have been made but not saved, **When** the developer attempts to navigate away, **Then** a confirmation prompt warns about unsaved changes.

---

### User Story 5 - Manage Execution History (Priority: P4)

A developer wants to review past executions to compare results and track improvements.

**Why this priority**: This provides valuable context for iterative development but is not essential for basic testing functionality.

**Independent Test**: Can be tested by running multiple executions and navigating through execution history. Delivers value by enabling comparison and regression testing.

**Acceptance Scenarios**:

1. **Given** multiple skill executions have been performed, **When** the developer views the execution history, **Then** a list of past executions is displayed with timestamps, status, and skill name.

2. **Given** an execution history list is displayed, **When** the developer selects a past execution, **Then** the full details (input, output, logs) are displayed.

---

### Edge Cases

- What happens when an uploaded zip file is corrupted or cannot be extracted?
  - System displays a clear error message indicating the file is corrupted and cannot be processed.

- How does the system handle extremely large skill packages (>100MB)?
  - System enforces a reasonable size limit (default 50MB) and displays an error for oversized packages.

- What happens when the LLM service is unavailable during skill execution?
  - System displays a connectivity error with retry option and preserves the input for when service resumes.

- How does the system handle skill execution that runs for an extended period?
  - System implements a configurable timeout (default 5 minutes) and notifies the user when approaching the limit.

- What happens when multiple files have the same name in different folders during repackaging?
  - System preserves the directory structure exactly as in the original package.

- How does the system handle binary files (images, etc.) in skill packages?
  - Binary files are displayed as non-editable with file type and size information; they are preserved during repackaging.

## Requirements *(mandatory)*

### Functional Requirements

**Skill Package Management**

- **FR-001**: System MUST accept skill packages as zip files through a file upload interface.
- **FR-002**: System MUST validate that uploaded packages contain a SKILL.md file at the root or recognized location.
- **FR-003**: System MUST parse SKILL.md YAML frontmatter and validate required fields (name, description).
- **FR-004**: System MUST provide clear, actionable validation error messages for specification violations.
- **FR-005**: System MUST display the skill package contents as an interactive directory tree.
- **FR-006**: System MUST support viewing file contents with appropriate syntax highlighting.
- **FR-007**: System MUST support in-browser editing of text-based files within the skill package.
- **FR-008**: System MUST allow downloading modified skill packages as new zip files.
- **FR-009**: System MUST re-validate skill packages after any file modifications.

**Skill Execution Runtime**

- **FR-010**: System MUST provide a runtime environment capable of executing Claude Skills according to the official specification.
- **FR-011**: System MUST inject skill instructions into the LLM context when executing a skill.
- **FR-012**: System MUST support user-provided test prompts as input for skill execution.
- **FR-013**: System MUST stream execution logs in real-time to the user interface.
- **FR-014**: System MUST capture and display skill execution results including LLM responses.
- **FR-015**: System MUST support cancellation of in-progress skill executions.
- **FR-016**: System MUST enforce execution timeouts to prevent runaway processes.
- **FR-017**: System MUST isolate skill executions to prevent cross-contamination between different skill runs.

**Execution History**

- **FR-018**: System MUST persist execution logs and results for later review within the session.
- **FR-019**: System MUST allow users to browse execution history.
- **FR-020**: System MUST display execution metadata (timestamp, duration, status) in history views.

### Key Entities

- **SkillPackage**: Represents an uploaded skill package; contains package metadata, validation status, file tree structure, and original/modified file contents.

- **SkillDefinition**: Parsed representation of SKILL.md; contains name, description, instructions, and references to resources and scripts.

- **Execution**: Represents a single skill run; contains input prompt, output result, execution logs, start/end timestamps, status (running/completed/failed/cancelled), and resource usage metrics.

- **ExecutionLog**: Time-ordered collection of log entries for an execution; each entry has timestamp, level (info/warn/error), and message content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can upload and validate a skill package in under 10 seconds for packages up to 10MB.

- **SC-002**: 95% of validation errors are resolved by users on first attempt after reading the error message (indicating clear, actionable feedback).

- **SC-003**: Users can navigate to and preview any file in a skill package within 3 clicks from the main view.

- **SC-004**: Skill execution results (or errors) are visible to users within 2 seconds of execution completion.

- **SC-005**: Real-time log updates appear in the UI within 500ms of being generated during execution.

- **SC-006**: Users can complete the full test cycle (upload → validate → edit → run → review results) in under 5 minutes for a simple skill.

- **SC-007**: System maintains execution history for at least 100 recent executions per session.

- **SC-008**: Modified skill packages can be downloaded and re-uploaded with all changes preserved.

## Assumptions

- Users have valid LLM provider credentials or the system has a configured default provider.
- Skill packages follow the Claude Skills specification format (SKILL.md with YAML frontmatter).
- The web application is accessed via modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions).
- Network connectivity is available for LLM API calls during skill execution.
- Session storage is sufficient for managing skill packages and execution history within a single browser session (persistent storage across sessions is a future enhancement).

## Out of Scope

- Multi-user collaboration on skill packages
- Version control integration for skill packages
- Deployment of skills to production Claude environments
- Skill marketplace or discovery features
- Mobile-optimized interface
- Offline skill execution capabilities
