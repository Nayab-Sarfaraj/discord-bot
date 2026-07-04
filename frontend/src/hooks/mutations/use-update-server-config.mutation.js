import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export function useUpdateServerConfig(guildId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patch) => api.put(`/config/${guildId}`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-config', guildId] })
    },
  })
}
