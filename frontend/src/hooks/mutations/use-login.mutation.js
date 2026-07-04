import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }) => api.post('/auth/login', { email, password }),
  })
}
