import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

function patchItems(pageData, updater) {
  if (!pageData) return pageData
  return { ...pageData, data: { ...pageData.data, items: updater(pageData.data.items) } }
}

function bumpTotal(pageData, delta) {
  if (!pageData) return pageData
  return { ...pageData, data: { ...pageData.data, total: pageData.data.total + delta } }
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

        // Grand total changed regardless of which page is currently cached
        // or being viewed — bump it everywhere once, before the page-1
        // item prepend below (which must NOT also touch total, or it'd be
        // double-counted).
        queryClient.setQueriesData({ queryKey: ['commands'] }, (old) => bumpTotal(old, 1))

        // A brand-new command always belongs at the top of page 1 — only
        // ever touch that page's item list. Visibly does nothing to the
        // list unless the admin happens to be on page 1, but the total
        // count above updates everywhere.
        queryClient.setQueryData(['commands', 1], (old) => patchItems(old, (items) => [doc, ...items]))
      })

      eventSource.addEventListener('command_updated', (event) => {
        const patch = JSON.parse(event.data)
        // The item could be on whatever page is currently cached — patch
        // every cached page's data, not just one. Doesn't change total.
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
