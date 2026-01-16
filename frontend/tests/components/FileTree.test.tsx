import { render, screen, fireEvent } from '@testing-library/react'
import { FileTree } from '@/components/explorer/FileTree'
import { describe, it, expect, vi } from 'vitest'
import type { SkillFile } from '@/types'

// Mock file data
const mockFiles: SkillFile[] = [
  {
    path: 'SKILL.md',
    name: 'SKILL.md',
    file_type: 'markdown',
    size_bytes: 100,
    is_binary: false,
    content: null,
    is_modified: false,
    children: null
  },
  {
    path: 'src',
    name: 'src',
    file_type: 'directory',
    size_bytes: 0,
    is_binary: false,
    content: null,
    is_modified: false,
    children: [
      {
        path: 'src/main.py',
        name: 'main.py',
        file_type: 'code',
        size_bytes: 200,
        is_binary: false,
        content: null,
        is_modified: false,
        children: null
      }
    ]
  }
]

describe('FileTree', () => {
  it('renders file list correctly', () => {
    const onSelect = vi.fn()
    render(<FileTree files={mockFiles} selectedPath={null} onSelect={onSelect} />)

    expect(screen.getByText('SKILL.md')).toBeInTheDocument()
    expect(screen.getByText('src')).toBeInTheDocument()
    // Children should be rendered recursively
    expect(screen.getByText('main.py')).toBeInTheDocument()
  })

  it('handles file selection', () => {
    const onSelect = vi.fn()
    render(<FileTree files={mockFiles} selectedPath={null} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('SKILL.md'))
    expect(onSelect).toHaveBeenCalledWith('SKILL.md')
  })

  it('does not select directories', () => {
    const onSelect = vi.fn()
    render(<FileTree files={mockFiles} selectedPath={null} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('src'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('highlights selected file', () => {
    const onSelect = vi.fn()
    render(<FileTree files={mockFiles} selectedPath="SKILL.md" onSelect={onSelect} />)

    const selectedFile = screen.getByText('SKILL.md').closest('button')
    expect(selectedFile).toHaveClass('bg-anthropic-stone/50')
  })
})
