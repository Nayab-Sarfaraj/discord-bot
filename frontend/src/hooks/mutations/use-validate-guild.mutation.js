import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'

export function useValidateGuild() {
  return useMutation({
    mutationFn: (guildId) => api.get(`/config/${guildId}/channels`),
  })
}
