import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

function patchItems(pageData, updater) {
  if (!pageData) return pageData
  return { ...pageData, data: { ...pageData.data, items: updater(pageData.data.items) } }
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
        // A brand-new command always belongs at the top of page 1 — only
        // ever touch that page's cache, regardless of which page is
        // currently being viewed. Visibly does nothing unless the admin
        // happens to be on page 1.
        queryClient.setQueryData(['commands', 1], (old) => patchItems(old, (items) => [doc, ...items]))
      })

      eventSource.addEventListener('command_updated', (event) => {
        const patch = JSON.parse(event.data)
        // The item could be on whatever page is currently cached — patch
        // every cached page's data, not just one.
        queryClient.setQueriesData({ queryKey: ['commands'] }, (old) =>
          patchItems(old, (items) =>
            items.map((item) => (item.interactionId === patch.interactionId ? { ...item, ...patch } : item)),
          ),
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
