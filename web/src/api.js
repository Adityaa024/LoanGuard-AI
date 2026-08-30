import { useEffect, useRef, useState } from 'react'

export async function api(pathname, opts = {}) {
  const token = localStorage.getItem('hive_token')
  const headers = { 'content-type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(pathname, {
    headers: { ...headers, ...(opts.headers || {}) },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  
  if (res.status === 401 || res.status === 403) {
    // Basic auto-logout on unauthorized
    localStorage.removeItem('hive_token')
    window.dispatchEvent(new Event('auth_error'))
  }
  
  return res.json()
}

export async function uploadDoc(file) {
  const fd = new FormData()
  fd.append('file', file)
  const token = localStorage.getItem('hive_token')
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch('/api/upload', { 
    method: 'POST', 
    headers,
    body: fd 
  })
  return res.json()
}

// Subscribe to the live SSE stream. Calls onEvent for every decoded event.
export function useEventStream(onEvent) {
  const handler = useRef(onEvent)
  handler.current = onEvent
  const [connected, setConnected] = useState(false)
  useEffect(() => {
    const es = new EventSource('/events')
    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.onmessage = (e) => {
      try {
        handler.current(JSON.parse(e.data))
      } catch {
        /* ignore keep-alives */
      }
    }
    return () => es.close()
  }, [])
  return connected
}

// Poll a JSON endpoint on an interval.
export function usePoll(pathname, intervalMs, deps = []) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const d = await api(pathname)
        if (alive) setData(d)
      } catch {
        /* ignore */
      }
    }
    tick()
    const id = setInterval(tick, intervalMs)
    return () => {
      alive = false
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return data
}
