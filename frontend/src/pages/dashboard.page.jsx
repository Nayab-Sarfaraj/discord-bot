import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useHealth } from '@/hooks/queries/use-health.query'
import { useCommands } from '@/hooks/queries/use-commands.query'
import { useLiveCommands } from '@/hooks/use-live-commands.hook'
import { useAuth } from '@/context/auth.context'

const STATUS_VARIANT = {
  received: 'secondary',
  processed: 'default',
  failed: 'destructive',
  pending: 'secondary',
  sent: 'default',
  skipped: 'secondary',
  done: 'default',
}

const AI_CATEGORY_VARIANT = {
  bug: 'destructive',
  feature: 'default',
  question: 'secondary',
  other: 'secondary',
}

export default function DashboardPage() {
  const [page, setPage] = useState(1)
  const { data: health } = useHealth()
  const { data: commandsRes, isLoading, isError } = useCommands(page)
  const { logout } = useAuth()
  useLiveCommands()

  const commands = commandsRes?.data?.items ?? []
  const total = commandsRes?.data?.total ?? 0
  const limit = commandsRes?.data?.limit ?? 10
  const hasNextPage = page * limit < total

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Live log of Discord slash-command activity</p>
          </div>
          <div className="flex items-center gap-3">
            {health && (
              <Badge variant="secondary" className="gap-1.5">
                API: {health.data.status}
              </Badge>
            )}
            <Link to="/settings">
              <Button variant="outline">Settings</Button>
            </Link>
            <Button variant="outline" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Commands</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading commands...</p>}
            {isError && <p className="py-6 text-center text-sm text-destructive">Failed to load commands.</p>}

            {!isLoading && !isError && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Command</TableHead>
                    <TableHead>Text</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mirror</TableHead>
                    <TableHead>AI Tag</TableHead>
                    <TableHead>AI Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commands.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No commands yet — run /report or /status in Discord.
                      </TableCell>
                    </TableRow>
                  )}
                  {commands.map((cmd) => (
                    <TableRow key={cmd._id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(cmd.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">/{cmd.commandName}</TableCell>
                      <TableCell className="max-w-xs whitespace-normal break-words text-muted-foreground">
                        {cmd.commandText ?? '—'}
                      </TableCell>
                      <TableCell>{cmd.username ?? 'unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[cmd.status] ?? 'secondary'}>{cmd.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[cmd.mirrorStatus] ?? 'secondary'}>{cmd.mirrorStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        {cmd.aiStatus === 'done' ? (
                          <Badge variant={AI_CATEGORY_VARIANT[cmd.aiCategory] ?? 'secondary'} className="capitalize">
                            {cmd.aiCategory}
                          </Badge>
                        ) : (
                          <Badge variant={STATUS_VARIANT[cmd.aiStatus] ?? 'secondary'}>{cmd.aiStatus}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-normal break-words text-muted-foreground">
                        {cmd.aiStatus === 'done' ? cmd.aiSummary : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!isLoading && !isError && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {Math.max(1, Math.ceil(total / limit))} ({total} total)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    Prev
                  </Button>
                  <Button variant="outline" disabled={!hasNextPage} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
