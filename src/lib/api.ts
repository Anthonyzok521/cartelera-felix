import { useEffect, useRef } from 'react'

export type SlideImage = {
  id: string
  filename: string
  url: string
  createdAt: string
}

export type Settings = {
  intervalSeconds: number
}

export type AppState = {
  settings: Settings
  images: SlideImage[]
}

type RequestOptions = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> }

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data && typeof data.error === 'string' ? data.error : 'Ocurrió un error inesperado.'
    throw new Error(message)
  }

  return data as T
}

export function fetchState() {
  return request<AppState>('/api/state')
}

export function uploadImages(files: File[]) {
  const body = new FormData()
  for (const file of files) body.append('images', file)
  return request<AppState>('/api/images', { method: 'POST', body })
}

export function deleteImage(id: string) {
  return request<AppState>(`/api/images/${id}`, { method: 'DELETE' })
}

export function moveImage(id: string, direction: 'up' | 'down') {
  return request<AppState>(`/api/images/${id}/move`, {
    method: 'POST',
    body: JSON.stringify({ direction }),
  })
}

export function updateInterval(intervalSeconds: number) {
  return request<AppState>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ intervalSeconds }),
  })
}

export function useLiveUpdates(onUpdate: () => void) {
  const handler = useRef(onUpdate)

  useEffect(() => {
    handler.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    const source = new EventSource('/api/events')
    const listener = () => handler.current()
    source.addEventListener('update', listener)
    return () => {
      source.removeEventListener('update', listener)
      source.close()
    }
  }, [])
}
