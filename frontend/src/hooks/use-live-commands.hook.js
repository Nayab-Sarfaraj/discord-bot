import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

function patchCommandsCache(queryClient, updater) {
  queryClient.setQueryData(['commands'], (old) => {
    if (!old) return old
    return { ...old, data: { ...old.data, items: updater(old.data.items), total: old.data.total } }
  })
}

export function useLiveCommands() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let eventSource
    let cancelled = false

    async function connect() {
      const ticketRes = await api.post('/events/ticket')
      if (cancelled) return

      const base = import.meta.env.VITE_API_BASE_URL || '/api'
      eventSource = new EventSource(`${base}/events?token=${ticketRes.data.ticket}`)

      eventSource.addEventListener('command_created', (event) => {
        const doc = JSON.parse(event.data)
        patchCommandsCache(queryClient, (items) => [doc, ...items])
      })

      eventSource.addEventListener('command_updated', (event) => {
        const patch = JSON.parse(event.data)
        patchCommandsCache(queryClient, (items) =>
          items.map((item) => (item.interactionId === patch.interactionId ? { ...item, ...patch } : item)),
        )
      })
    }

    connect()

    return () => {
      cancelled = true
      eventSource?.close()
    }
  }, [queryClient])
}
