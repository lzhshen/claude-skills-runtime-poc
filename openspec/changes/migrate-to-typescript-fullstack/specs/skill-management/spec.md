# Spec Delta: Skill Management

## ADDED Requirements

### Requirement: TypeScript Skill Package Service
The system SHALL provide a TypeScript-based skill package management service using Hono framework that maintains API contract compatibility with the previous Python implementation.

#### Scenario: Skill package upload via multipart form
- **WHEN** a client sends a POST request to `/api/v1/skills/upload` with a multipart form containing a zip file
- **THEN** the system SHALL extract the zip, validate SKILL.md, parse metadata, and return a SkillPackage object
- **AND** the response format SHALL match the existing API contract

#### Scenario: Skill package retrieval
- **WHEN** a client sends a GET request to `/api/v1/skills/:id`
- **THEN** the system SHALL return the SkillPackage with metadata, validation status, and file tree
- **AND** return 404 if the skill does not exist

#### Scenario: Skill package deletion
- **WHEN** a client sends a DELETE request to `/api/v1/skills/:id`
- **THEN** the system SHALL remove the skill from storage and clean up extracted files
- **AND** return 404 if the skill does not exist

### Requirement: TypeScript File Tree Operations
The system SHALL provide file tree generation and file content operations for skill packages using Node.js file system APIs.

#### Scenario: Get file tree structure
- **WHEN** a client sends a GET request to `/api/v1/skills/:id/files`
- **THEN** the system SHALL return the hierarchical file tree with file metadata (path, name, type, size, hash)

#### Scenario: Get individual file content
- **WHEN** a client sends a GET request to `/api/v1/skills/:id/files/*` for a text file
- **THEN** the system SHALL return the file content with appropriate content type
- **AND** return 404 if the file does not exist

#### Scenario: Update individual file content
- **WHEN** a client sends a PUT request to `/api/v1/skills/:id/files/*` with new content
- **THEN** the system SHALL update the file, mark it as modified, and recalculate hash
- **AND** trigger SKILL.md revalidation if SKILL.md is modified

### Requirement: TypeScript Zip Repack Operations
The system SHALL provide zip repacking functionality using JSZip library to create downloadable skill packages.

#### Scenario: Repack modified skill
- **WHEN** a client sends a POST request to `/api/v1/skills/:id/repack`
- **THEN** the system SHALL create a new zip file containing all current files with modifications applied

#### Scenario: Download skill package
- **WHEN** a client sends a GET request to `/api/v1/skills/:id/download`
- **THEN** the system SHALL return the repacked zip file with appropriate Content-Disposition header

### Requirement: TypeScript SKILL.md Validation
The system SHALL validate SKILL.md files using js-yaml for YAML frontmatter parsing with the same validation rules as the Python implementation.

#### Scenario: Valid SKILL.md with all required fields
- **WHEN** a skill package contains a SKILL.md with valid YAML frontmatter including name and description
- **THEN** the validation status SHALL be 'valid' and metadata SHALL be populated

#### Scenario: Missing SKILL.md file
- **WHEN** a skill package does not contain a SKILL.md file
- **THEN** the validation status SHALL be 'invalid' with error code 'MISSING_SKILL_MD'

#### Scenario: Invalid YAML frontmatter
- **WHEN** a skill package contains a SKILL.md with malformed YAML frontmatter
- **THEN** the validation status SHALL be 'invalid' with error code 'INVALID_YAML'

#### Scenario: Missing required fields
- **WHEN** a skill package SKILL.md is missing name or description fields
- **THEN** the validation status SHALL be 'invalid' with appropriate error code ('MISSING_NAME' or 'MISSING_DESCRIPTION')

### Requirement: TypeScript Zip Security Checks
The system SHALL enforce zip security checks using JSZip to prevent path traversal and zip bomb attacks.

#### Scenario: Path traversal attempt blocked
- **WHEN** a zip file contains entries with path traversal patterns (e.g., `../`)
- **THEN** the system SHALL reject the upload with error code 'PATH_TRAVERSAL'

#### Scenario: Zip bomb detection
- **WHEN** a zip file has an extraction ratio exceeding the configured threshold
- **THEN** the system SHALL reject the upload with error code 'ZIP_BOMB'

#### Scenario: File size limit enforcement
- **WHEN** a zip file or extracted content exceeds the configured size limit
- **THEN** the system SHALL reject the upload with error code 'FILE_TOO_LARGE'
