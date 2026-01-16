import { render, screen, fireEvent } from '@testing-library/react'
import { CodeEditor } from '@/components/editor/CodeEditor'
import { describe, it, expect, vi } from 'vitest'
import type { SkillFile } from '@/types'

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, language, options }: any) => {
    return (
      <div data-testid="monaco-editor">
        <div data-testid="monaco-language">{language}</div>
        <textarea
          data-testid="monaco-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={options?.readOnly}
        />
      </div>
    )
  },
}))

// Mock file data
const mockFile: SkillFile = {
  path: 'script.py',
  name: 'script.py',
  file_type: 'code',
  size_bytes: 100,
  is_binary: false,
  content: 'print("hello")',
  is_modified: false,
  children: null
}

const mockBinaryFile: SkillFile = {
  ...mockFile,
  path: 'image.png',
  name: 'image.png',
  file_type: 'binary',
  is_binary: true,
  content: null
}

describe('CodeEditor', () => {
  it('renders editor with file content', () => {
    const onChange = vi.fn()
    render(<CodeEditor file={mockFile} value="print('hello')" onChange={onChange} />)

    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    expect(screen.getByTestId('monaco-textarea')).toHaveValue("print('hello')")
    expect(screen.getByText('script.py')).toBeInTheDocument()
  })

  it('detects language from extension', () => {
    const onChange = vi.fn()
    render(<CodeEditor file={mockFile} value="" onChange={onChange} />)
    
    expect(screen.getByTestId('monaco-language')).toHaveTextContent('python')
  })

  it('handles changes', () => {
    const onChange = vi.fn()
    render(<CodeEditor file={mockFile} value="" onChange={onChange} />)

    fireEvent.change(screen.getByTestId('monaco-textarea'), { target: { value: 'new code' } })
    expect(onChange).toHaveBeenCalledWith('new code')
  })

  it('shows placeholder when no file selected', () => {
    const onChange = vi.fn()
    render(<CodeEditor file={null} value="" onChange={onChange} />)

    expect(screen.getByText('Select a file to edit')).toBeInTheDocument()
    expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument()
  })

  it('shows warning for binary files', () => {
    const onChange = vi.fn()
    render(<CodeEditor file={mockBinaryFile} value="" onChange={onChange} />)

    expect(screen.getByText(/Binary file - cannot edit/)).toBeInTheDocument()
    expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument()
  })

  it('respects readOnly prop', () => {
    const onChange = vi.fn()
    render(<CodeEditor file={mockFile} value="" onChange={onChange} isReadOnly={true} />)

    expect(screen.getByTestId('monaco-textarea')).toBeDisabled()
    expect(screen.getByText('Read Only')).toBeInTheDocument()
  })
})
