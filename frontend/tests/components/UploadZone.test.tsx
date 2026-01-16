import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UploadZone } from '@/components/upload/UploadZone'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockUpload = vi.fn()
const mockClearError = vi.fn()

let mockIsUploading = false
let mockError: string | null = null

vi.mock('@/hooks/useSkillUpload', () => ({
  useSkillUpload: () => ({
    upload: mockUpload,
    isUploading: mockIsUploading,
    error: mockError,
    clearError: mockClearError,
  }),
}))

describe('UploadZone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsUploading = false
    mockError = null
  })

  it('renders upload prompt correctly', () => {
    render(<UploadZone />)
    expect(screen.getByText('Upload Skill Package')).toBeInTheDocument()
    expect(screen.getByText(/Drag and drop a .zip file/)).toBeInTheDocument()
    expect(screen.getByText('Maximum file size: 10MB')).toBeInTheDocument()
  })

  it('handles file selection', async () => {
    const onUploadComplete = vi.fn()
    mockUpload.mockResolvedValue({ id: '123' }) 

    render(<UploadZone onUploadComplete={onUploadComplete} />)

    const file = new File(['dummy content'], 'test.zip', { type: 'application/zip' })
    
    // Find the file input - it is hidden so we use container query or direct selection
    // The component has <input type="file" ... />
    // We can select it by its type attribute using querySelector if needed, or by testing-library
    // Since it's hidden, getByLabelText might fail if not associated or hidden.
    // We'll use container.querySelector to find the input.
    
    const { container } = render(<UploadZone onUploadComplete={onUploadComplete} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    
    expect(input).toBeInTheDocument()
    
    // Trigger change event
    fireEvent.change(input, { target: { files: [file] } })
    
    await waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith(file)
    })
    
    await waitFor(() => {
        expect(onUploadComplete).toHaveBeenCalled()
    })
  })
})
