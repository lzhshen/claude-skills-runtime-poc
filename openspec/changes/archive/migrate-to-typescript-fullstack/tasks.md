# Tasks: TypeScript Full-Stack Migration

## Phase 0: Infrastructure Setup

- [x] 0.1 Initialize pnpm at project root with `pnpm init`
- [x] 0.2 Create `pnpm-workspace.yaml` with packages/* configuration
- [x] 0.3 Create `tsconfig.base.json` with shared TypeScript settings
- [x] 0.4 Create `packages/shared/` package structure
- [x] 0.5 Extract types from `frontend/src/types/models.ts` to `packages/shared/src/types/`
- [x] 0.6 Create Zod schemas in `packages/shared/src/schemas/` matching types
- [x] 0.7 Move `frontend/` to `packages/frontend/`
- [x] 0.8 Update frontend imports to use `@skills-runtime/shared`
- [x] 0.9 Create `packages/backend/` skeleton with Hono setup
- [x] 0.10 Verify `pnpm install` succeeds and packages can import from shared
- [x] 0.11 Verify frontend builds and runs with new structure

## Phase 1: Utility Functions

- [x] 1.1 Port `utils/yaml_parser.py` to `utils/yaml-parser.ts` (frontmatter parsing)
- [x] 1.2 Port `utils/file_utils.py` to `utils/file-utils.ts` (file operations)
- [x] 1.3 Port `utils/zip_extractor.py` to `utils/zip-extractor.ts` (zip extraction, security checks)
- [x] 1.4 Port `utils/zip_repacker.py` to `utils/zip-repacker.ts` (zip repacking)
- [x] 1.5 Port `utils/file_tree.py` to `utils/file-tree.ts` (file tree generation)
- [x] 1.6 Port `utils/errors.py` to `utils/errors.ts` (error types and handling)
- [x] 1.7 Port `utils/config.py` to `utils/config.ts` (configuration settings)
- [x] 1.8 Write unit tests for all utility functions
- [x] 1.9 Validate with testdata/skills/valid/* and testdata/skills/invalid/*

## Phase 2: Skill Management API

- [x] 2.1 Create `services/skill.storage.ts` (in-memory skill storage)
- [x] 2.2 Create `services/skill.validator.ts` (SKILL.md validation logic)
- [x] 2.3 Create `services/skill.service.ts` (skill business logic)
- [x] 2.4 Create `routes/skills.ts` with Hono router
- [x] 2.5 Implement `POST /api/v1/skills/upload` (multipart file upload)
- [x] 2.6 Implement `GET /api/v1/skills/:id` (get skill details)
- [x] 2.7 Implement `DELETE /api/v1/skills/:id` (delete skill)
- [x] 2.8 Implement `GET /api/v1/skills/:id/files` (get file tree)
- [x] 2.9 Implement `GET /api/v1/skills/:id/files/*` (get file content)
- [x] 2.10 Implement `PUT /api/v1/skills/:id/files/*` (update file)
- [x] 2.11 Implement `POST /api/v1/skills/:id/repack` (repack skill)
- [x] 2.12 Implement `GET /api/v1/skills/:id/download` (download skill zip)
- [x] 2.13 Write integration tests for all skill endpoints
- [x] 2.14 Test with frontend: upload, view, edit skill packages

## Phase 3: Execution Engine

- [x] 3.1 Create `services/execution.storage.ts` (in-memory execution storage)
- [x] 3.2 Create `services/opencode.client.ts` (OpenCode SDK client factory)
- [x] 3.3 Create `services/execution.service.ts` (execution business logic)
- [x] 3.4 Create `routes/executions.ts` with Hono router
- [x] 3.5 Implement `POST /api/v1/executions/skills/:id/execute` (start execution)
- [x] 3.6 Implement `GET /api/v1/executions/:id/stream` (SSE log streaming)
- [x] 3.7 Implement `POST /api/v1/executions/:id/cancel` (cancel execution)
- [x] 3.8 Implement `GET /api/v1/executions/:id` (get execution details)
- [x] 3.9 Implement `GET /api/v1/executions/:id/logs` (get execution logs)
- [x] 3.10 Implement `GET /api/v1/executions` (list executions)
- [x] 3.11 Implement OpenCode event stream processing (message.part.updated, session.idle, etc.)
- [x] 3.12 Implement execution timeout handling
- [x] 3.13 Write integration tests for execution endpoints
- [x] 3.14 Test with frontend: execute skill, view real-time logs

## Phase 4: System Configuration

- [x] 4.1 Create `routes/health.ts` with health check endpoint
- [x] 4.2 Create `routes/config.ts` with config endpoints
- [x] 4.3 Implement `GET /api/v1/health` (health check with OpenCode status)
- [x] 4.4 Implement `GET /api/v1/config/providers` (list providers)
- [x] 4.5 Implement `GET /api/v1/config/agents` (list agents)
- [x] 4.6 Create `src/index.ts` main entry point with all routes
- [x] 4.7 Add CORS middleware for frontend access
- [x] 4.8 Add error handling middleware
- [x] 4.9 Write integration tests for config endpoints
- [x] 4.10 Test with frontend: settings page functionality

## Phase 5: Testing and Validation

- [x] 5.1 Configure Vitest for backend package
- [x] 5.2 Add test coverage reporting with v8
- [ ] 5.3 Write remaining unit tests to achieve 80% coverage
- [x] 5.4 Create E2E test workflow: upload → execute → stream → complete
- [x] 5.5 Validate all testdata/skills/valid/* packages work correctly
- [x] 5.6 Validate all testdata/skills/invalid/* packages produce correct errors
- [ ] 5.7 Compare API responses with Python backend for parity
- [ ] 5.8 Performance benchmark: response times, memory usage

## Phase 6: Cleanup and Documentation

- [x] 6.1 Delete `backend/` Python directory
- [x] 6.2 Remove Python-related config files (requirements.txt, etc.)
- [x] 6.3 Update CLAUDE.md with new commands and structure
- [x] 6.4 Update docker-compose.yml for TypeScript backend
- [x] 6.5 Create/update README.md with setup instructions
- [ ] 6.6 Final validation: clean clone, pnpm install, full test suite
- [x] 6.7 Archive this change proposal
