# Spec Delta: System Configuration

## ADDED Requirements

### Requirement: TypeScript Health Check Endpoint
The system SHALL provide a health check endpoint that verifies system status and OpenCode server connectivity.

#### Scenario: Health check with OpenCode server available
- **WHEN** a client sends a GET request to `/api/v1/health`
- **AND** the OpenCode server is reachable
- **THEN** the system SHALL return status 'healthy' with opencode_connected: true

#### Scenario: Health check with OpenCode server unavailable
- **WHEN** a client sends a GET request to `/api/v1/health`
- **AND** the OpenCode server is not reachable
- **THEN** the system SHALL return status 'degraded' with opencode_connected: false

### Requirement: TypeScript Provider Configuration API
The system SHALL provide an endpoint to retrieve available AI providers and models from OpenCode.

#### Scenario: List available providers
- **WHEN** a client sends a GET request to `/api/v1/config/providers`
- **THEN** the system SHALL return a list of providers with their available models
- **AND** each provider SHALL include id, name, and models array

#### Scenario: Provider list with OpenCode unavailable
- **WHEN** a client sends a GET request to `/api/v1/config/providers`
- **AND** the OpenCode server is not reachable
- **THEN** the system SHALL return an empty list or cached values

### Requirement: TypeScript Agent Configuration API
The system SHALL provide an endpoint to retrieve available agents from OpenCode.

#### Scenario: List available agents
- **WHEN** a client sends a GET request to `/api/v1/config/agents`
- **THEN** the system SHALL return a list of agents with id, name, and description

### Requirement: TypeScript CORS Configuration
The system SHALL configure CORS middleware to allow frontend access during development.

#### Scenario: CORS headers for frontend origin
- **WHEN** a request is received from the configured frontend origin (e.g., http://localhost:5173)
- **THEN** the system SHALL include appropriate CORS headers allowing the request

#### Scenario: Preflight OPTIONS requests
- **WHEN** an OPTIONS preflight request is received
- **THEN** the system SHALL respond with appropriate CORS headers and 204 status

### Requirement: TypeScript Error Handling Middleware
The system SHALL provide consistent error response formatting across all endpoints.

#### Scenario: Validation error response
- **WHEN** a request fails Zod validation
- **THEN** the system SHALL return a 400 response with structured error details

#### Scenario: Not found error response
- **WHEN** a requested resource is not found
- **THEN** the system SHALL return a 404 response with error message

#### Scenario: Internal server error response
- **WHEN** an unexpected error occurs
- **THEN** the system SHALL return a 500 response with error message
- **AND** log the full error details server-side

### Requirement: TypeScript Application Configuration
The system SHALL use environment variables for configuration with sensible defaults.

#### Scenario: Configuration from environment variables
- **WHEN** the application starts
- **THEN** it SHALL read configuration from environment variables:
  - `PORT` - Server port (default: 8000)
  - `OPENCODE_SERVER_URL` - OpenCode server URL (default: http://127.0.0.1:4096)
  - `CORS_ORIGINS` - Allowed CORS origins (default: http://localhost:5173)
  - `EXECUTION_TIMEOUT_MS` - Execution timeout (default: 300000)

#### Scenario: Configuration validation at startup
- **WHEN** required configuration is missing or invalid
- **THEN** the application SHALL fail fast with a clear error message
