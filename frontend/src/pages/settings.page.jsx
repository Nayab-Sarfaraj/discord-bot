import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useServerConfig } from '@/hooks/queries/use-server-config.query'
import { useUpdateServerConfig } from '@/hooks/mutations/use-update-server-config.mutation'

const KNOWN_COMMANDS = ['report', 'status']

export default function SettingsPage() {
  const [guildId, setGuildId] = useState('')
  const [appliedGuildId, setAppliedGuildId] = useState('')
  const [commandToggles, setCommandToggles] = useState({})
  const [mirrorEnabled, setMirrorEnabled] = useState(true)

  const { data: configRes, isFetching } = useServerConfig(appliedGuildId)
  const updateConfig = useUpdateServerConfig(appliedGuildId)

  useEffect(() => {
    if (configRes?.data) {
      setCommandToggles(configRes.data.commandToggles ?? {})
      setMirrorEnabled(configRes.data.mirrorEnabled ?? true)
    }
  }, [configRes])

  const loadConfig = (e) => {
    e.preventDefault()
    if (!guildId.trim()) return
    setAppliedGuildId(guildId.trim())
  }

  const save = () => {
    updateConfig.mutate(
      { commandToggles, mirrorEnabled },
      {
        onSuccess: () => toast.success('Settings saved'),
        onError: (err) => toast.error(err.message || 'Failed to save settings'),
      },
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Command Settings</h1>
            <p className="text-sm text-muted-foreground">Per-server command rules and mirroring</p>
          </div>
          <Link to="/">
            <Button variant="outline">Back</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Server</CardTitle>
            <CardDescription>Load a Discord server by its guild ID to edit its config</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={loadConfig} className="flex items-end gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="guildId">Guild ID</Label>
                <Input
                  id="guildId"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  placeholder="Discord server ID"
                />
              </div>
              <Button type="submit">Load</Button>
            </form>
          </CardContent>
        </Card>

        {appliedGuildId && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Rules</CardTitle>
              <CardDescription>Changes take effect on the next command run</CardDescription>
            </CardHeader>
            <CardContent>
              {isFetching && <p className="text-sm text-muted-foreground">Loading config...</p>}
              {!isFetching && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3">
                    {KNOWN_COMMANDS.map((name) => (
                      <div key={name} className="flex items-center justify-between">
                        <Label htmlFor={`toggle-${name}`} className="font-normal">
                          /{name}
                        </Label>
                        <Switch
                          id={`toggle-${name}`}
                          checked={commandToggles[name] !== false}
                          onCheckedChange={(checked) =>
                            setCommandToggles((prev) => ({ ...prev, [name]: checked }))
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="mirror-enabled" className="font-normal">
                      Mirror to Slack
                    </Label>
                    <Switch id="mirror-enabled" checked={mirrorEnabled} onCheckedChange={setMirrorEnabled} />
                  </div>

                  <Button onClick={save} disabled={updateConfig.isPending} className="mt-1 w-full">
                    {updateConfig.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
