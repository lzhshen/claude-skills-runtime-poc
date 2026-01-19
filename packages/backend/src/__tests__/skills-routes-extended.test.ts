/**
 * Extended Skills API routes tests to improve coverage.
 * Tests file content retrieval, file updates, repack and download endpoints.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Hono } from 'hono';
import { skillsRoutes } from '../routes/skills.js';
import { resetSkillStorage } from '../services/skill.storage.js';
import { resetSkillService } from '../services/skill.service.js';

const TESTDATA_DIR = join(process.cwd(), '../../testdata/skills');

// Create test app
const app = new Hono();
app.route('/api/v1/skills', skillsRoutes);

// Helper to upload a skill package
async function uploadSkillPackage(filename: string = 'brand-guidelines.zip'): Promise<string> {
  const zipPath = join(TESTDATA_DIR, filename);
  const zipData = await readFile(zipPath);

  const formData = new FormData();
  formData.append('file', new Blob([zipData], { type: 'application/zip' }), filename);

  const res = await app.request('/api/v1/skills/upload', {
    method: 'POST',
    body: formData,
  });

  const body = await res.json() as { id: string };
  return body.id;
}

describe('Skills Routes Extended Tests', () => {
  beforeEach(() => {
    resetSkillStorage();
    resetSkillService();
  });

  afterEach(() => {
    resetSkillStorage();
    resetSkillService();
  });

  describe('GET /api/v1/skills/:id/files/* - Get file content', () => {
    it('should get file content for a specific file', async () => {
      const packageId = await uploadSkillPackage();

      // Get SKILL.md content
      const res = await app.request(`/api/v1/skills/${packageId}/files/SKILL.md`);

      expect(res.status).toBe(200);

      const body = await res.json() as { path: string; content: string; is_binary: boolean };
      expect(body.path).toBe('SKILL.md');
      expect(body.content).toBeDefined();
      expect(body.is_binary).toBe(false);
    });

    it('should return 400 when file path is empty', async () => {
      const packageId = await uploadSkillPackage();

      // Try to get file with empty path - this hits the route but path extraction fails
      const res = await app.request(`/api/v1/skills/${packageId}/files/`);

      // The route matches but returns error for empty path
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent file', async () => {
      const packageId = await uploadSkillPackage();

      const res = await app.request(`/api/v1/skills/${packageId}/files/nonexistent.txt`);

      expect(res.status).toBe(404);

      const body = await res.json() as { error: { code: string } };
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 for non-existent package', async () => {
      const res = await app.request('/api/v1/skills/invalid-id/files/SKILL.md');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/skills/:id/files/* - Update file', () => {
    it('should update file content', async () => {
      const packageId = await uploadSkillPackage();

      const newContent = '---\nname: Updated Skill\ndescription: Updated description\n---\n\nUpdated instructions';

      const res = await app.request(`/api/v1/skills/${packageId}/files/SKILL.md`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });

      expect(res.status).toBe(200);

      const body = await res.json() as { path: string; content: string; is_modified: boolean };
      expect(body.path).toBe('SKILL.md');
      expect(body.content).toBe(newContent);
      expect(body.is_modified).toBe(true);
    });

    it('should return 400 when content is missing', async () => {
      const packageId = await uploadSkillPackage();

      const res = await app.request(`/api/v1/skills/${packageId}/files/SKILL.md`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);

      const body = await res.json() as { error: { code: string } };
      expect(body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 when file path is empty', async () => {
      const packageId = await uploadSkillPackage();

      const res = await app.request(`/api/v1/skills/${packageId}/files/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'test' }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent file', async () => {
      const packageId = await uploadSkillPackage();

      const res = await app.request(`/api/v1/skills/${packageId}/files/nonexistent.txt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'test' }),
      });

      expect(res.status).toBe(404);
    });

    it('should allow updating file with empty content', async () => {
      const packageId = await uploadSkillPackage();

      const res = await app.request(`/api/v1/skills/${packageId}/files/SKILL.md`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '' }),
      });

      expect(res.status).toBe(200);

      const body = await res.json() as { content: string };
      expect(body.content).toBe('');
    });
  });

  describe('POST /api/v1/skills/:id/repack - Repack skill', () => {
    it('should repack skill package', async () => {
      const packageId = await uploadSkillPackage();

      const res = await app.request(`/api/v1/skills/${packageId}/repack`, {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/zip');
      expect(res.headers.get('Content-Disposition')).toContain('brand-guidelines-modified.zip');
    });

    it('should return 404 for non-existent package', async () => {
      const res = await app.request('/api/v1/skills/invalid-id/repack', {
        method: 'POST',
      });

      expect(res.status).toBe(404);
    });

    it('should repack with modified files', async () => {
      const packageId = await uploadSkillPackage();

      // Update a file first
      await app.request(`/api/v1/skills/${packageId}/files/SKILL.md`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '---\nname: Modified\ndescription: Modified desc\n---\nModified' }),
      });

      // Then repack
      const res = await app.request(`/api/v1/skills/${packageId}/repack`, {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/zip');

      // Verify response has content
      const arrayBuffer = await res.arrayBuffer();
      expect(arrayBuffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/skills/:id/download - Download skill', () => {
    it('should download skill package', async () => {
      const packageId = await uploadSkillPackage();

      const res = await app.request(`/api/v1/skills/${packageId}/download`);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/zip');
      expect(res.headers.get('Content-Disposition')).toContain('brand-guidelines.zip');
    });

    it('should return 404 for non-existent package', async () => {
      const res = await app.request('/api/v1/skills/invalid-id/download');

      expect(res.status).toBe(404);
    });

    it('should download repacked content after modification', async () => {
      const packageId = await uploadSkillPackage();

      // Update a file
      await app.request(`/api/v1/skills/${packageId}/files/SKILL.md`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '---\nname: Downloaded\ndescription: Test\n---\nTest' }),
      });

      // Download
      const res = await app.request(`/api/v1/skills/${packageId}/download`);

      expect(res.status).toBe(200);

      const arrayBuffer = await res.arrayBuffer();
      expect(arrayBuffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/skills/:id/files - File tree edge cases', () => {
    it('should return 404 for non-existent package file tree', async () => {
      const res = await app.request('/api/v1/skills/invalid-id/files');

      expect(res.status).toBe(404);
    });
  });
});
