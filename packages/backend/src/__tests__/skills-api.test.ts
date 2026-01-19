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

// Type for skill package response
interface SkillPackageResponse {
  id: string;
  validation_status: string;
  validation_errors: Array<{ code: string; message: string }>;
  metadata?: { name: string; description: string };
  files: Array<{ path: string }>;
  error?: { code: string; message: string };
}

// Type for file tree response
interface FileTreeResponse {
  tree: unknown[];
  files: unknown[];
}

describe('Skills API Integration Tests', () => {
  beforeEach(() => {
    resetSkillStorage();
    resetSkillService();
  });

  afterEach(() => {
    resetSkillStorage();
    resetSkillService();
  });

  describe('POST /api/v1/skills/upload', () => {
    it('should upload and validate a valid skill package', async () => {
      const zipPath = join(TESTDATA_DIR, 'brand-guidelines.zip');
      const zipData = await readFile(zipPath);

      const formData = new FormData();
      formData.append('file', new Blob([zipData], { type: 'application/zip' }), 'brand-guidelines.zip');

      const res = await app.request('/api/v1/skills/upload', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(201);

      const body = await res.json() as SkillPackageResponse;
      expect(body.id).toBeDefined();
      expect(body.validation_status).toBe('valid');
      expect(body.metadata).toBeDefined();
      expect(body.metadata!.name).toBeDefined();
      expect(body.metadata!.description).toBeDefined();
      expect(body.files).toBeDefined();
      expect(body.files.length).toBeGreaterThan(0);
    });

    it('should reject invalid zip file', async () => {
      const notZipPath = join(TESTDATA_DIR, 'not-a-zip.txt');
      const notZipData = await readFile(notZipPath);

      const formData = new FormData();
      formData.append('file', new Blob([notZipData], { type: 'application/zip' }), 'not-a-zip.zip');

      const res = await app.request('/api/v1/skills/upload', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(201); // Package is created but invalid

      const body = await res.json() as SkillPackageResponse;
      expect(body.validation_status).toBe('invalid');
      expect(body.validation_errors.length).toBeGreaterThan(0);
    });

    it('should reject package missing SKILL.md', async () => {
      const zipPath = join(TESTDATA_DIR, 'missing-skill-md.zip');
      const zipData = await readFile(zipPath);

      const formData = new FormData();
      formData.append('file', new Blob([zipData], { type: 'application/zip' }), 'missing-skill-md.zip');

      const res = await app.request('/api/v1/skills/upload', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(201);

      const body = await res.json() as SkillPackageResponse;
      expect(body.validation_status).toBe('invalid');
      expect(body.validation_errors.some((e) => e.code === 'MISSING_SKILL_MD')).toBe(true);
    });

    it('should reject package with missing name', async () => {
      const zipPath = join(TESTDATA_DIR, 'missing-name.zip');
      const zipData = await readFile(zipPath);

      const formData = new FormData();
      formData.append('file', new Blob([zipData], { type: 'application/zip' }), 'missing-name.zip');

      const res = await app.request('/api/v1/skills/upload', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(201);

      const body = await res.json() as SkillPackageResponse;
      expect(body.validation_status).toBe('invalid');
      expect(body.validation_errors.some((e) => e.code === 'MISSING_NAME')).toBe(true);
    });

    it('should return 400 when no file provided', async () => {
      const formData = new FormData();

      const res = await app.request('/api/v1/skills/upload', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(400);

      const body = await res.json() as SkillPackageResponse;
      expect(body.error!.code).toBe('INVALID_REQUEST');
    });
  });

  describe('GET /api/v1/skills/:id', () => {
    it('should get skill package by ID', async () => {
      // First upload a package
      const zipPath = join(TESTDATA_DIR, 'brand-guidelines.zip');
      const zipData = await readFile(zipPath);

      const formData = new FormData();
      formData.append('file', new Blob([zipData], { type: 'application/zip' }), 'brand-guidelines.zip');

      const uploadRes = await app.request('/api/v1/skills/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadBody = await uploadRes.json() as SkillPackageResponse;
      const packageId = uploadBody.id;

      // Get the package
      const res = await app.request(`/api/v1/skills/${packageId}`);

      expect(res.status).toBe(200);

      const body = await res.json() as SkillPackageResponse;
      expect(body.id).toBe(packageId);
      expect(body.validation_status).toBe('valid');
    });

    it('should return 404 for non-existent package', async () => {
      const res = await app.request('/api/v1/skills/non-existent-id');

      expect(res.status).toBe(404);

      const body = await res.json() as SkillPackageResponse;
      expect(body.error!.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/skills/:id', () => {
    it('should delete skill package', async () => {
      // First upload a package
      const zipPath = join(TESTDATA_DIR, 'brand-guidelines.zip');
      const zipData = await readFile(zipPath);

      const formData = new FormData();
      formData.append('file', new Blob([zipData], { type: 'application/zip' }), 'brand-guidelines.zip');

      const uploadRes = await app.request('/api/v1/skills/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadBody = await uploadRes.json() as SkillPackageResponse;
      const packageId = uploadBody.id;

      // Delete the package
      const deleteRes = await app.request(`/api/v1/skills/${packageId}`, {
        method: 'DELETE',
      });

      expect(deleteRes.status).toBe(200);

      // Verify it's deleted
      const getRes = await app.request(`/api/v1/skills/${packageId}`);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 when deleting non-existent package', async () => {
      const res = await app.request('/api/v1/skills/non-existent-id', {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/skills/:id/files', () => {
    it('should get file tree for package', async () => {
      // First upload a package
      const zipPath = join(TESTDATA_DIR, 'brand-guidelines.zip');
      const zipData = await readFile(zipPath);

      const formData = new FormData();
      formData.append('file', new Blob([zipData], { type: 'application/zip' }), 'brand-guidelines.zip');

      const uploadRes = await app.request('/api/v1/skills/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadBody = await uploadRes.json() as SkillPackageResponse;
      const packageId = uploadBody.id;

      // Get file tree
      const res = await app.request(`/api/v1/skills/${packageId}/files`);

      expect(res.status).toBe(200);

      const body = await res.json() as FileTreeResponse;
      expect(body.tree).toBeDefined();
      expect(body.files).toBeDefined();
      expect(Array.isArray(body.tree)).toBe(true);
    });
  });
});
