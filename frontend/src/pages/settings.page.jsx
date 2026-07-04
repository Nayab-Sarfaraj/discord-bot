import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useServerConfig } from '@/hooks/queries/use-server-config.query'
import { useUpdateServerConfig } from '@/hooks/mutations/use-update-server-config.mutation'
import { useValidateGuild } from '@/hooks/mutations/use-validate-guild.mutation'

const KNOWN_COMMANDS = ['report', 'status']

// View Channels (1024) + Send Messages (2048) — the minimum the bot needs
// to post to a channel, nothing more.
const INVITE_PERMISSIONS = 3072
const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_APPLICATION_ID}&permissions=${INVITE_PERMISSIONS}&scope=bot%20applications.commands`

export default function SettingsPage() {
  const [guildId, setGuildId] = useState('')
  const [validatedGuildId, setValidatedGuildId] = useState('')
  const [channels, setChannels] = useState([])
  const [selectedChannelId, setSelectedChannelId] = useState('')
  const [commandToggles, setCommandToggles] = useState({})
  const [mirrorEnabled, setMirrorEnabled] = useState(true)

  const validateGuild = useValidateGuild()
  const { data: configRes, isFetching: isFetchingConfig } = useServerConfig(validatedGuildId)
  const updateConfig = useUpdateServerConfig(validatedGuildId)

  // Pre-populate from any existing config once a guild validates —
  // avoids resetting toggles/channel every time an already-connected
  // server is re-validated.
  useEffect(() => {
    if (configRes?.data) {
      setCommandToggles(configRes.data.commandToggles ?? {})
      setMirrorEnabled(configRes.data.mirrorEnabled ?? true)
      if (configRes.data.channelId) {
        setSelectedChannelId(configRes.data.channelId)
      }
    }
  }, [configRes])

  const validate = (e) => {
    e.preventDefault()
    const trimmed = guildId.trim()
    if (!trimmed) return

    setValidatedGuildId('')
    setChannels([])
    setSelectedChannelId('')

    validateGuild.mutate(trimmed, {
      onSuccess: (res) => {
        setValidatedGuildId(trimmed)
        setChannels(res.data.channels)
        if (res.data.channels.length === 0) {
          toast.error('No text channels found — the bot needs View Channel access somewhere in this server.')
        }
      },
      onError: (err) => toast.error(err.message || 'Could not validate this server'),
    })
  }

  const save = () => {
    updateConfig.mutate(
      { channelId: selectedChannelId, commandToggles, mirrorEnabled },
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
            <h1 className="text-2xl font-semibold tracking-tight">Connect Discord</h1>
            <p className="text-sm text-muted-foreground">Add the bot, pick a channel, configure commands</p>
          </div>
          <Link to="/">
            <Button variant="outline">Back</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Step 1 — Add the bot</CardTitle>
            <CardDescription>Invite it to the server you want to connect</CardDescription>
          </CardHeader>
          <CardContent>
            <a href={inviteUrl} target="_blank" rel="noreferrer">
              <Button variant="outline">Add Bot to Your Server</Button>
            </a>
            <p className="mt-3 text-sm text-muted-foreground">
              After adding the bot to your server, come back here and continue to Step 2 below to confirm it worked.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Step 2 — Validate the server</CardTitle>
            <CardDescription>Confirms the bot is actually a member before fetching channels</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={validate} className="flex items-end gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="guildId">Guild ID</Label>
                <Input
                  id="guildId"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  placeholder="Discord server ID"
                />
              </div>
              <Button type="submit" disabled={validateGuild.isPending}>
                {validateGuild.isPending ? 'Validating...' : 'Validate & Fetch Channels'}
              </Button>
            </form>
            {validatedGuildId && (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-500">
                <CheckCircle2 className="size-4" />
                Bot found in server ✅
              </p>
            )}
          </CardContent>
        </Card>

        {validatedGuildId && channels.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Step 3 — Pick a channel</CardTitle>
              <CardDescription>Where the bot mirrors notifications and can post</CardDescription>
            </CardHeader>
            <CardContent>
              {isFetchingConfig ? (
                <p className="text-sm text-muted-foreground">Loading existing config...</p>
              ) : (
                <select
                  value={selectedChannelId}
                  onChange={(e) => setSelectedChannelId(e.target.value)}
                  className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                >
                  <option value="" disabled>
                    Select a channel
                  </option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))}
                </select>
              )}
            </CardContent>
          </Card>
        )}

        {validatedGuildId && channels.length > 0 && !isFetchingConfig && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Step 4 — Configure & save</CardTitle>
              <CardDescription>Changes take effect on the next command run</CardDescription>
            </CardHeader>
            <CardContent>
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

                <Button onClick={save} disabled={!selectedChannelId || updateConfig.isPending} className="mt-1 w-full">
                  {updateConfig.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
