/**
 * Skill management API routes.
 */

import { Hono } from 'hono';
import { getSkillService } from '../services/skill.service.js';
import { buildFileTree } from '../utils/file-tree.js';
import { repackSkillZip } from '../utils/zip-repacker.js';
import { NotFoundError, BinaryFileError, errorToResponse, getErrorStatusCode } from '../utils/errors.js';

export const skillsRoutes = new Hono();

// POST /api/v1/skills/upload - Upload skill package
skillsRoutes.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'No file provided' } }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const content = new Uint8Array(arrayBuffer);

    const service = getSkillService();
    const pkg = await service.uploadAndValidate(content, file.name);

    return c.json(pkg, 201);
  } catch (error) {
    console.error('Upload error:', error);
    return c.json(errorToResponse(error), getErrorStatusCode(error));
  }
});

// GET /api/v1/skills/:id - Get skill details
skillsRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const service = getSkillService();
    const pkg = service.getPackage(id);

    if (!pkg) {
      throw new NotFoundError('Skill package', id);
    }

    return c.json(pkg);
  } catch (error) {
    return c.json(errorToResponse(error), getErrorStatusCode(error));
  }
});

// DELETE /api/v1/skills/:id - Delete skill
skillsRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const service = getSkillService();
    const deleted = await service.deletePackage(id);

    if (!deleted) {
      throw new NotFoundError('Skill package', id);
    }

    return c.json({ success: true, id });
  } catch (error) {
    return c.json(errorToResponse(error), getErrorStatusCode(error));
  }
});

// GET /api/v1/skills/:id/files - Get file tree
skillsRoutes.get('/:id/files', async (c) => {
  try {
    const id = c.req.param('id');
    const service = getSkillService();
    const files = service.getFileTree(id);

    if (!files) {
      throw new NotFoundError('Skill package', id);
    }

    const tree = buildFileTree(files);

    return c.json({ tree, files });
  } catch (error) {
    return c.json(errorToResponse(error), getErrorStatusCode(error));
  }
});

// GET /api/v1/skills/:id/files/* - Get file content
skillsRoutes.get('/:id/files/*', async (c) => {
  try {
    const id = c.req.param('id');
    // Extract file path from URL - remove the /api/v1/skills/:id/files/ prefix
    const url = new URL(c.req.url);
    const pathMatch = url.pathname.match(/\/api\/v1\/skills\/[^/]+\/files\/(.+)/);
    const filePath = pathMatch ? decodeURIComponent(pathMatch[1]) : '';

    if (!filePath) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'File path is required' } }, 400);
    }

    const service = getSkillService();
    const file = service.getFileContent(id, filePath);

    if (!file) {
      throw new NotFoundError('File', filePath);
    }

    return c.json(file);
  } catch (error) {
    return c.json(errorToResponse(error), getErrorStatusCode(error));
  }
});

// PUT /api/v1/skills/:id/files/* - Update file
skillsRoutes.put('/:id/files/*', async (c) => {
  try {
    const id = c.req.param('id');
    // Extract file path from URL
    const url = new URL(c.req.url);
    const pathMatch = url.pathname.match(/\/api\/v1\/skills\/[^/]+\/files\/(.+)/);
    const filePath = pathMatch ? decodeURIComponent(pathMatch[1]) : '';

    if (!filePath) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'File path is required' } }, 400);
    }

    const body = await c.req.json<{ content: string }>();
    if (!body.content && body.content !== '') {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'Content is required' } }, 400);
    }

    const service = getSkillService();

    // Check if file exists and is not binary
    const existingFile = service.getFileContent(id, filePath);
    if (!existingFile) {
      throw new NotFoundError('File', filePath);
    }
    if (existingFile.is_binary) {
      throw new BinaryFileError();
    }

    const updatedFile = await service.updateFileContent(id, filePath, body.content);

    if (!updatedFile) {
      throw new NotFoundError('File', filePath);
    }

    return c.json(updatedFile);
  } catch (error) {
    return c.json(errorToResponse(error), getErrorStatusCode(error));
  }
});

// POST /api/v1/skills/:id/repack - Repack skill
skillsRoutes.post('/:id/repack', async (c) => {
  try {
    const id = c.req.param('id');
    const service = getSkillService();
    const pkg = service.getPackage(id);

    if (!pkg) {
      throw new NotFoundError('Skill package', id);
    }

    // Get the stored package with binary contents
    const storedPkg = (service as any).storage.get(id);
    if (!storedPkg) {
      throw new NotFoundError('Skill package', id);
    }

    // Build files with binary content for repacking
    const filesWithContent = pkg.files.map((file) => ({
      ...file,
      binary_content: storedPkg.binaryContents?.get(file.path),
    }));

    // Get modified contents
    const modifiedContents = storedPkg.modifiedContents || new Map<string, string>();

    // Repack
    const zipContent = await repackSkillZip(filesWithContent, modifiedContents);

    // Generate filename
    const originalName = pkg.original_filename.replace(/\.zip$/i, '');
    const filename = `${originalName}-modified.zip`;

    // Return as download
    return new Response(zipContent, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipContent.length.toString(),
      },
    });
  } catch (error) {
    return c.json(errorToResponse(error), getErrorStatusCode(error));
  }
});

// GET /api/v1/skills/:id/download - Download skill zip
skillsRoutes.get('/:id/download', async (c) => {
  try {
    const id = c.req.param('id');
    const service = getSkillService();
    const pkg = service.getPackage(id);

    if (!pkg) {
      throw new NotFoundError('Skill package', id);
    }

    // Get the stored package with binary contents
    const storedPkg = (service as any).storage.get(id);
    if (!storedPkg) {
      throw new NotFoundError('Skill package', id);
    }

    // Build files with binary content
    const filesWithContent = pkg.files.map((file) => ({
      ...file,
      binary_content: storedPkg.binaryContents?.get(file.path),
    }));

    // Get modified contents
    const modifiedContents = storedPkg.modifiedContents || new Map<string, string>();

    // Repack
    const zipContent = await repackSkillZip(filesWithContent, modifiedContents);

    // Return as download
    return new Response(zipContent, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${pkg.original_filename}"`,
        'Content-Length': zipContent.length.toString(),
      },
    });
  } catch (error) {
    return c.json(errorToResponse(error), getErrorStatusCode(error));
  }
});
