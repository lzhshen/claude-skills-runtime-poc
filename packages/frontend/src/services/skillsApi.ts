/**
 * Skills API service.
 */

import { apiGet, apiPost, apiPut, apiDelete, API_BASE_URL } from './api'
import type {
  SkillPackage,
  SkillFile,
  FileTreeResponse,
  RepackResponse,
  FileUpdateRequest,
} from '@/types'

/**
 * Upload a skill package zip file.
 */
export async function uploadSkill(file: File): Promise<SkillPackage> {
  const formData = new FormData()
  formData.append('file', file)

  return apiPost<SkillPackage>('/skills/upload', formData)
}

/**
 * Get skill package details.
 */
export async function getSkill(skillId: string): Promise<SkillPackage> {
  return apiGet<SkillPackage>(`/skills/${skillId}`)
}

/**
 * Delete a skill package.
 */
export async function deleteSkill(skillId: string): Promise<void> {
  return apiDelete<void>(`/skills/${skillId}`)
}

/**
 * Get file tree for a skill package.
 */
export async function getFileTree(skillId: string): Promise<FileTreeResponse> {
  return apiGet<FileTreeResponse>(`/skills/${skillId}/files`)
}

/**
 * Get file content.
 */
export async function getFileContent(skillId: string, filePath: string): Promise<SkillFile> {
  const encodedPath = encodeURIComponent(filePath)
  return apiGet<SkillFile>(`/skills/${skillId}/files/${encodedPath}`)
}

/**
 * Update file content.
 */
export async function updateFileContent(
  skillId: string,
  filePath: string,
  content: string
): Promise<SkillFile> {
  const encodedPath = encodeURIComponent(filePath)
  const body: FileUpdateRequest = { content }
  return apiPut<SkillFile>(`/skills/${skillId}/files/${encodedPath}`, body)
}

/**
 * Repack skill package.
 */
export async function repackSkill(skillId: string): Promise<RepackResponse> {
  return apiPost<RepackResponse>(`/skills/${skillId}/repack`)
}

/**
 * Get download URL for skill package.
 */
export function getDownloadUrl(skillId: string): string {
  return `${API_BASE_URL}/skills/${skillId}/download`
}
