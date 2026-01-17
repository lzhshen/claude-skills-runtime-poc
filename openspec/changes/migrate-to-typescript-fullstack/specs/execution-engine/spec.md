# Spec Delta: Execution Engine

## ADDED Requirements

### Requirement: TypeScript OpenCode SDK Integration
The system SHALL integrate with OpenCode server using the official `@opencode-ai/sdk` TypeScript package instead of the custom Python SDK.

#### Scenario: Create OpenCode client
- **WHEN** the backend initializes
- **THEN** it SHALL create an OpenCode client configured with the server URL from environment variables

#### Scenario: SDK client connection validation
- **WHEN** a health check is performed
- **THEN** the system SHALL verify connectivity to the OpenCode server using the SDK

### Requirement: TypeScript Skill Execution Session Management
The system SHALL manage skill execution sessions using OpenCode SDK session APIs with SSE streaming for real-time log delivery.

#### Scenario: Start skill execution
- **WHEN** a client sends a POST request to `/api/v1/executions/skills/:id/execute` with a user prompt
- **THEN** the system SHALL:
  1. Create an OpenCode session with the skill content as system prompt
  2. Subscribe to the event stream
  3. Send the user prompt to the session
  4. Return an ExecutionSession object with status 'running'

#### Scenario: Execution with model selection
- **WHEN** the execute request includes model configuration (provider_id, model_id)
- **THEN** the system SHALL pass the model selection to the OpenCode session

#### Scenario: Get execution details
- **WHEN** a client sends a GET request to `/api/v1/executions/:id`
- **THEN** the system SHALL return the ExecutionSession with current status, result, and error if applicable

#### Scenario: List executions
- **WHEN** a client sends a GET request to `/api/v1/executions`
- **THEN** the system SHALL return all execution sessions, optionally filtered by skill_package_id

### Requirement: TypeScript SSE Log Streaming
The system SHALL provide Server-Sent Events streaming for real-time execution logs using Hono's streaming capabilities.

#### Scenario: Stream execution logs
- **WHEN** a client connects to `GET /api/v1/executions/:id/stream`
- **THEN** the system SHALL:
  1. Send existing logs as initial events
  2. Stream new log events as they occur
  3. Send a 'done' event when execution completes
  4. Keep connection alive with periodic heartbeats

#### Scenario: SSE event format compatibility
- **WHEN** log events are streamed
- **THEN** they SHALL use the same event types and JSON structure as the Python implementation:
  - `event: log` with `data: {"timestamp": ..., "type": ..., "content": ...}`
  - `event: status` for status updates
  - `event: done` for completion

#### Scenario: Get execution logs without streaming
- **WHEN** a client sends a GET request to `/api/v1/executions/:id/logs`
- **THEN** the system SHALL return all collected logs as a JSON array

### Requirement: TypeScript OpenCode Event Processing
The system SHALL process OpenCode event stream events and convert them to execution logs.

#### Scenario: Process message part updates
- **WHEN** the OpenCode stream emits a `message.part.updated` event
- **THEN** the system SHALL create a log entry with the message content

#### Scenario: Process tool calls
- **WHEN** the OpenCode stream emits tool call events
- **THEN** the system SHALL create log entries for tool invocation and results

#### Scenario: Process session completion
- **WHEN** the OpenCode stream emits a `session.idle` event
- **THEN** the system SHALL:
  1. Mark execution status as 'completed'
  2. Collect final response from messages
  3. Calculate duration

#### Scenario: Process session errors
- **WHEN** the OpenCode stream emits a `session.error` event
- **THEN** the system SHALL:
  1. Mark execution status as 'failed'
  2. Record error details in ExecutionError

### Requirement: TypeScript Execution Cancellation
The system SHALL support cancelling running executions via OpenCode SDK.

#### Scenario: Cancel running execution
- **WHEN** a client sends a POST request to `/api/v1/executions/:id/cancel`
- **THEN** the system SHALL:
  1. Send abort signal to the OpenCode session
  2. Mark execution status as 'cancelled'
  3. Return success response

#### Scenario: Cancel non-running execution
- **WHEN** a cancel request is made for an execution that is not running
- **THEN** the system SHALL return an error indicating the execution cannot be cancelled

### Requirement: TypeScript Execution Timeout Handling
The system SHALL enforce execution timeouts and handle them gracefully.

#### Scenario: Execution timeout
- **WHEN** an execution exceeds the configured timeout duration
- **THEN** the system SHALL:
  1. Cancel the OpenCode session
  2. Mark execution status as 'timeout'
  3. Record timeout in logs
