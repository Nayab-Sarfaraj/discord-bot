import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export function useServerConfig(guildId) {
  return useQuery({
    queryKey: ['server-config', guildId],
    queryFn: () => api.get(`/config/${guildId}`),
    enabled: !!guildId,
  })
}
