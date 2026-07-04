import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export function useCommands() {
  return useQuery({
    queryKey: ['commands'],
    queryFn: () => api.get('/commands'),
  })
}
