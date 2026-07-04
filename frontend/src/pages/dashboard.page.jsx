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
  const { data: health } = useHealth()
  const { data: commandsRes, isLoading, isError } = useCommands()
  const { logout } = useAuth()
  useLiveCommands()

  const commands = commandsRes?.data?.items ?? []

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
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mirror</TableHead>
                    <TableHead>AI Triage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commands.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No commands yet — run /report or /status in Discord.
                      </TableCell>
                    </TableRow>
                  )}
                  {commands.map((cmd) => (
                    <TableRow key={cmd._id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(cmd.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">/{cmd.commandName}</span>
                        {cmd.commandText ? <span className="text-muted-foreground"> — {cmd.commandText}</span> : null}
                      </TableCell>
                      <TableCell>{cmd.username ?? 'unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[cmd.status] ?? 'secondary'}>{cmd.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[cmd.mirrorStatus] ?? 'secondary'}>{cmd.mirrorStatus}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {cmd.aiStatus === 'done' ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant={AI_CATEGORY_VARIANT[cmd.aiCategory] ?? 'secondary'} className="w-fit capitalize">
                              {cmd.aiCategory}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{cmd.aiSummary}</span>
                          </div>
                        ) : (
                          <Badge variant={STATUS_VARIANT[cmd.aiStatus] ?? 'secondary'}>{cmd.aiStatus}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
