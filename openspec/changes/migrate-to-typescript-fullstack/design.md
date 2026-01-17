# Design: TypeScript Full-Stack Migration

## Context

The Claude Skills Runtime POC currently uses a dual-stack architecture:
- **Backend**: Python 3.11+ with FastAPI, Pydantic, pytest
- **Frontend**: TypeScript 5.x with React 18.x, TailwindCSS, Vite

This creates several pain points:
1. Self-maintained Python SDK for OpenCode (`opencode-sdk-new`)
2. Duplicate type definitions (Pydantic models + TypeScript interfaces)
3. Two distinct testing ecosystems (pytest + Vitest)
4. Higher cognitive overhead switching between languages

The official `@opencode-ai/sdk` provides native TypeScript support, making migration attractive.

## Goals / Non-Goals

### Goals
- Unified TypeScript codebase for frontend and backend
- Use official `@opencode-ai/sdk` instead of custom Python SDK
- Maintain API contract compatibility (no frontend changes required)
- Establish pnpm monorepo for shared code
- Achieve 80%+ test coverage on new backend

### Non-Goals
- Changing API contracts or response formats
- Adding new features during migration
- Supporting Python backend post-migration
- Database integration (remains in-memory storage)

## Decisions

### D1: Hono as Backend Framework
**Decision**: Use Hono instead of Express/Fastify

**Rationale**:
- Lightweight, fast, modern TypeScript-first design
- Built-in SSE streaming support (`hono/streaming`)
- Native Zod integration via `@hono/zod-validator`
- Excellent type inference
- Similar routing patterns to FastAPI

**Alternatives Considered**:
- Express: More boilerplate, weaker TypeScript support
- Fastify: Heavier, more complex plugin system
- Elysia: Bun-only, limits deployment options

### D2: pnpm Monorepo Structure
**Decision**: Use pnpm workspaces with `packages/` structure

**Rationale**:
- Shared types between frontend and backend
- Single lock file, consistent dependency versions
- Efficient disk usage via hard links
- Well-established in TypeScript ecosystem

**Structure**:
```
claude-skills-runtime-poc/
├── packages/
│   ├── shared/          # @skills-runtime/shared
│   ├── backend/         # @skills-runtime/backend
│   └── frontend/        # @skills-runtime/frontend
├── testdata/
├── specs/
├── openspec/
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### D3: Zod for Runtime Validation
**Decision**: Use Zod schemas that generate TypeScript types

**Rationale**:
- Single source of truth: schema -> types -> validation
- Excellent error messages
- Built-in Hono integration
- Familiar to TypeScript developers

**Example**:
```typescript
// packages/shared/src/schemas/skill.ts
import { z } from 'zod';

export const SkillMetadataSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  raw_content: z.string(),
  instruction: z.string(),
  extra_fields: z.record(z.unknown()),
});

export type SkillMetadata = z.infer<typeof SkillMetadataSchema>;
```

### D4: Incremental Migration with Parallel Operation
**Decision**: Build new backend while preserving old, switch atomically

**Rationale**:
- Lower risk: can validate behavior matches
- Frontend continues working during development
- Easy rollback if issues discovered
- Can run both backends on different ports for testing

**Migration Phases**:
1. P0: Monorepo infrastructure + shared types
2. P1: Utility functions (yaml-parser, zip handling)
3. P2: Skill management APIs
4. P3: Execution engine (OpenCode integration)
5. P4: Config and health endpoints
6. P5: Testing and validation
7. P6: Cleanup (remove Python code)

## Risks / Trade-offs

### R1: OpenCode SDK API Differences
**Risk**: Official SDK may have different API surface than custom Python SDK
**Mitigation**:
- Reference `.opencode/node_modules/@opencode-ai/sdk` source during implementation
- Create thin adapter layer if needed
- Test against running `opencode serve` instance

### R2: SSE Stream Format Compatibility
**Risk**: Frontend expects specific SSE event format
**Mitigation**:
- Preserve exact same event types and JSON structure
- Use Hono's `streamSSE` which matches standard SSE format
- Integration tests validating stream format

### R3: File System Operations Performance
**Risk**: Node.js file operations may differ from Python
**Mitigation**:
- Use `fs/promises` for async I/O
- JSZip handles zip operations efficiently
- Profile if performance issues arise

### R4: Type Drift Between Packages
**Risk**: Shared types may diverge if not properly maintained
**Mitigation**:
- All types in `packages/shared/`
- Both frontend and backend import from shared
- TypeScript compilation catches drift at build time

## Migration Plan

### Phase 0: Infrastructure (P0)
1. Initialize pnpm monorepo at project root
2. Create `pnpm-workspace.yaml`
3. Create `packages/shared/` with extracted types
4. Move `frontend/` to `packages/frontend/`
5. Create `packages/backend/` skeleton
6. Verify `pnpm install` and cross-package imports work

### Phase 1: Utilities (P1)
Port Python utilities to TypeScript:
- `yaml_parser.py` → `yaml-parser.ts`
- `file_utils.py` → `file-utils.ts`
- `zip_extractor.py` → `zip-extractor.ts`
- `zip_repacker.py` → `zip-repacker.ts`
- `file_tree.py` → `file-tree.ts`
- `errors.py` → `errors.ts`
- `config.py` → `config.ts`

### Phase 2: Skill Management (P2)
Implement skill endpoints:
- `POST /api/v1/skills/upload`
- `GET /api/v1/skills/:id`
- `DELETE /api/v1/skills/:id`
- `GET /api/v1/skills/:id/files`
- `GET /api/v1/skills/:id/files/*`
- `PUT /api/v1/skills/:id/files/*`
- `POST /api/v1/skills/:id/repack`
- `GET /api/v1/skills/:id/download`

### Phase 3: Execution Engine (P3)
Implement OpenCode integration:
- `POST /api/v1/executions/skills/:id/execute`
- `GET /api/v1/executions/:id/stream`
- `POST /api/v1/executions/:id/cancel`
- `GET /api/v1/executions/:id`
- `GET /api/v1/executions/:id/logs`
- `GET /api/v1/executions`

### Phase 4: System Config (P4)
Implement remaining endpoints:
- `GET /api/v1/health`
- `GET /api/v1/config/providers`
- `GET /api/v1/config/agents`

### Phase 5: Testing (P5)
- Unit tests for all utilities and services
- Integration tests for API endpoints
- E2E tests for complete workflows
- Coverage threshold: 80%

### Phase 6: Cleanup (P6)
- Delete `backend/` Python directory
- Update CLAUDE.md with new commands
- Update docker-compose.yml
- Final documentation updates

## Open Questions

1. **Port Configuration**: Should backend use port 8000 (same as FastAPI) or different port during migration?
   - Recommendation: Use different port (e.g., 3001) during development, switch to 8000 at cutover

2. **Build Tool**: Use tsx for development, what for production?
   - Recommendation: tsup for building, tsx for dev server

3. **Docker Strategy**: Rebuild Docker images or multi-stage build?
   - Recommendation: Multi-stage build with Node.js base image
