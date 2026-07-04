import { useQuery, keepPreviousData } from '@tanstack/react-query'
import api from '@/lib/api'

export const COMMANDS_PAGE_SIZE = 20

export function useCommands(page = 1) {
  return useQuery({
    queryKey: ['commands', page],
    queryFn: () => api.get('/commands', { params: { page, limit: COMMANDS_PAGE_SIZE } }),
    placeholderData: keepPreviousData, // no loading flash when clicking Prev/Next
  })
}
