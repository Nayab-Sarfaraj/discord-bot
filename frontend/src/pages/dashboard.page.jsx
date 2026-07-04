import { Badge } from '@/components/ui/badge'
import { useHealth } from '@/hooks/queries/use-health.query'

export default function DashboardPage() {
  const { data, isLoading, isError } = useHealth()

  return (
    <div style={{ padding: 32 }}>
      <h1>Admin Dashboard</h1>
      <p>
        API status:{' '}
        {isLoading && <Badge variant="secondary">checking...</Badge>}
        {isError && <Badge variant="destructive">unreachable</Badge>}
        {data && <Badge>{data.data.status}</Badge>}
      </p>
    </div>
  )
}
