/**
 * Base API service with fetch wrapper.
 */

const API_BASE_URL =
  (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE_URL || '/api/v1'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const errorData = await response.json()
      const error = errorData.error || errorData
      throw new ApiError(
        error.code || 'UNKNOWN_ERROR',
        error.message || 'An unknown error occurred',
        response.status,
        error
      )
    }
    throw new ApiError(
      'HTTP_ERROR',
      `HTTP ${response.status}: ${response.statusText}`,
      response.status
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return response.json()
  }

  return response.blob() as Promise<T>
}

function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  return url.toString()
}

export async function apiGet<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  const { params, ...fetchOptions } = options || {}
  const url = buildUrl(endpoint, params)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  })

  return handleResponse<T>(response)
}

export async function apiPost<T>(
  endpoint: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  const { params, ...fetchOptions } = options || {}
  const url = buildUrl(endpoint, params)

  const headers: HeadersInit = {
    Accept: 'application/json',
    ...fetchOptions.headers,
  }

  let requestBody: BodyInit | undefined

  if (body instanceof FormData) {
    requestBody = body
  } else if (body !== undefined) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json'
    requestBody = JSON.stringify(body)
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: requestBody,
    ...fetchOptions,
  })

  return handleResponse<T>(response)
}

export async function apiPut<T>(
  endpoint: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  const { params, ...fetchOptions } = options || {}
  const url = buildUrl(endpoint, params)

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...fetchOptions,
  })

  return handleResponse<T>(response)
}

export async function apiDelete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  const { params, ...fetchOptions } = options || {}
  const url = buildUrl(endpoint, params)

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  })

  return handleResponse<T>(response)
}

export function createSSEConnection(endpoint: string): EventSource {
  const url = buildUrl(endpoint)
  return new EventSource(url)
}

export { API_BASE_URL }
