# Change: Migrate to TypeScript Full-Stack Architecture

## Why

The current dual-stack architecture (Python FastAPI backend + TypeScript React frontend) creates maintenance overhead and requires a self-maintained Python SDK for OpenCode integration. The official `@opencode-ai/sdk` is TypeScript-native, making a unified TypeScript stack the natural choice for reduced complexity and better SDK support.

## What Changes

### Architecture Changes
- **BREAKING**: Replace Python FastAPI backend with Hono (TypeScript)
- Restructure project as pnpm monorepo with `packages/` structure
- Extract shared types from frontend to `packages/shared/`
- Migrate frontend to `packages/frontend/`
- Create new TypeScript backend in `packages/backend/`

### Technology Stack Migration
| Component | Current (Python) | Target (TypeScript) |
|-----------|------------------|---------------------|
| Web Framework | FastAPI | Hono |
| Data Validation | Pydantic | Zod |
| OpenCode SDK | opencode-sdk-new (custom) | @opencode-ai/sdk (official) |
| Zip Processing | zipfile | JSZip |
| YAML Parsing | PyYAML | js-yaml |
| Testing | pytest | Vitest |
| Package Manager | pip | pnpm (monorepo) |

### API Contract
- All existing API endpoints preserved with identical contracts
- SSE streaming format remains unchanged for frontend compatibility
- No breaking changes to frontend API consumption

## Impact

### Affected Specs
- `skill-management` - Skill package upload, validation, file operations
- `execution-engine` - OpenCode integration, SSE streaming, session management
- `system-config` - Health checks, provider/agent configuration

### Affected Code
- `backend/` - Entire directory replaced (Python -> TypeScript)
- `frontend/` - Moved to `packages/frontend/`, minimal code changes
- Root configuration files - New monorepo setup (pnpm-workspace.yaml, tsconfig.base.json)

### Files to Delete (Post-Migration)
- `backend/` - Entire Python backend directory
- Python-specific configs (requirements.txt, pyproject.toml if present)

### Files to Preserve
- `testdata/` - Test data unchanged
- `specs/` - Specification documents unchanged
- `openspec/` - OpenSpec configuration unchanged
