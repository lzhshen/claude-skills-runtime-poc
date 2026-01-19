import { render, screen } from '@testing-library/react'
import { FilePreview } from '@/components/explorer/FilePreview'
import { describe, it, expect } from 'vitest'
import type { SkillFile } from '@/types'

const mockFile: SkillFile = {
  path: 'SKILL.md',
  name: 'SKILL.md',
  file_type: 'markdown',
  size_bytes: 100,
  is_binary: false,
  content: '# Hello World',
  is_modified: false,
  children: null
}

const mockBinaryFile: SkillFile = {
  path: 'image.png',
  name: 'image.png',
  file_type: 'binary',
  size_bytes: 1024,
  is_binary: true,
  content: null,
  is_modified: false,
  children: null
}

describe('FilePreview', () => {
  it('renders file content', () => {
    render(<FilePreview file={mockFile} />)

    expect(screen.getByText('# Hello World')).toBeInTheDocument()
    expect(screen.getByText('SKILL.md')).toBeInTheDocument()
    // Check size format (100 B)
    expect(screen.getByText('100 B')).toBeInTheDocument()
  })

  it('renders binary file warning', () => {
    render(<FilePreview file={mockBinaryFile} />)

    expect(screen.getByText('Binary file - cannot preview')).toBeInTheDocument()
    expect(screen.getByText('Size: 1 KB')).toBeInTheDocument()
  })

  it('shows empty state when no file selected', () => {
    render(<FilePreview file={null} />)

    expect(screen.getByText('Select a file to preview')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    const { container } = render(<FilePreview file={null} isLoading={true} />)

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows modified badge', () => {
    const modifiedFile = { ...mockFile, is_modified: true }
    render(<FilePreview file={modifiedFile} />)

    expect(screen.getByText('Modified')).toBeInTheDocument()
  })
})
