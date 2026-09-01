import { useEffect, useState } from "react"
import {
  INVITABLE_ROLES,
  ROLE_BADGE_TOKENS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  SMTP_TLS_MODES,
  type InvitationSummary,
  type SmtpSettingsResponse,
  type SmtpTlsMode,
  type UserRole,
  type UserSummary,
} from "@playblast/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageError } from "@/components/feedback/page-error"
import { PageLoading } from "@/components/feedback/page-loading"
import { useSession } from "@/hooks/use-session"
import {
  createInvitation,
  fetchInvitations,
  fetchSmtpSettings,
  fetchUsers,
  isIdentityApiError,
  resendInvitation,
  revokeInvitation,
  testSmtpSettings,
  updateSmtpSettings,
  updateUser,
} from "@/lib/identity-api"
import { cn } from "@/lib/utils"
import { showErrorToast, showSuccessToast } from "@/lib/toast"

const INVITE_STATUS_LABELS: Record<InvitationSummary["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  expired: "Expired",
  revoked: "Revoked",
  delivery_failed: "Delivery failed",
}

export function TeamPage() {
  const { role } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<UserSummary[]>([])
  const [invitations, setInvitations] = useState<InvitationSummary[]>([])
  const [smtp, setSmtp] = useState<SmtpSettingsResponse | null>(null)

  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("587")
  const [smtpUsername, setSmtpUsername] = useState("")
  const [smtpPassword, setSmtpPassword] = useState("")
  const [smtpFromEmail, setSmtpFromEmail] = useState("")
  const [smtpTlsMode, setSmtpTlsMode] = useState<SmtpTlsMode>("starttls")
  const [smtpInstanceUrl, setSmtpInstanceUrl] = useState(
    typeof window !== "undefined" ? window.location.origin : "",
  )
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smtpFormError, setSmtpFormError] = useState<string | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<(typeof INVITABLE_ROLES)[number]>("creative")
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  async function reloadTeam() {
    setLoading(true)
    setError(null)
    try {
      const [userRows, invitationRows, smtpSettings] = await Promise.all([
        fetchUsers(),
        fetchInvitations(),
        fetchSmtpSettings(),
      ])
      setUsers(userRows)
      setInvitations(invitationRows)
      setSmtp(smtpSettings)
      if (smtpSettings.configured) {
        setSmtpHost(smtpSettings.host ?? "")
        setSmtpPort(String(smtpSettings.port ?? 587))
        setSmtpUsername(smtpSettings.username ?? "")
        setSmtpFromEmail(smtpSettings.fromEmail ?? "")
        setSmtpTlsMode(smtpSettings.tlsMode ?? "starttls")
        setSmtpInstanceUrl(smtpSettings.instanceUrl ?? window.location.origin)
      }
    } catch (loadError) {
      if (isIdentityApiError(loadError) && loadError.code === "FORBIDDEN") {
        setError("You do not have permission to manage team settings.")
      } else {
        setError("Could not load team data.")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (role !== "admin") {
      return
    }

    let cancelled = false

    async function load() {
      try {
        const [userRows, invitationRows, smtpSettings] = await Promise.all([
          fetchUsers(),
          fetchInvitations(),
          fetchSmtpSettings(),
        ])
        if (cancelled) {
          return
        }
        setUsers(userRows)
        setInvitations(invitationRows)
        setSmtp(smtpSettings)
        if (smtpSettings.configured) {
          setSmtpHost(smtpSettings.host ?? "")
          setSmtpPort(String(smtpSettings.port ?? 587))
          setSmtpUsername(smtpSettings.username ?? "")
          setSmtpFromEmail(smtpSettings.fromEmail ?? "")
          setSmtpTlsMode(smtpSettings.tlsMode ?? "starttls")
          setSmtpInstanceUrl(smtpSettings.instanceUrl ?? window.location.origin)
        }
        setError(null)
      } catch (loadError) {
        if (cancelled) {
          return
        }
        if (isIdentityApiError(loadError) && loadError.code === "FORBIDDEN") {
          setError("You do not have permission to manage team settings.")
        } else {
          setError("Could not load team data.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [role])

  if (role !== "admin") {
    return (
      <PageError
        title="Forbidden"
        message="Team administration is limited to Admin accounts."
      />
    )
  }

  if (loading) {
    return (
      <PageLoading label="Loading team...">
        <div className="text-muted-foreground text-sm">Loading team...</div>
      </PageLoading>
    )
  }

  if (error) {
    return <PageError title="Team unavailable" message={error} onRetry={() => void reloadTeam()} />
  }

  async function handleSaveSmtp(event: React.FormEvent) {
    event.preventDefault()
    setSmtpFormError(null)
    setSmtpSaving(true)
    try {
      const updated = await updateSmtpSettings({
        host: smtpHost,
        port: Number(smtpPort),
        username: smtpUsername || undefined,
        password: smtpPassword || undefined,
        fromEmail: smtpFromEmail,
        tlsMode: smtpTlsMode,
        instanceUrl: smtpInstanceUrl,
      })
      setSmtp(updated)
      setSmtpPassword("")
      showSuccessToast("SMTP settings saved.")
    } catch (saveError) {
      setSmtpFormError(
        isIdentityApiError(saveError) ? saveError.message : "Could not save SMTP settings.",
      )
    } finally {
      setSmtpSaving(false)
    }
  }

  async function handleTestSmtp() {
    setSmtpTesting(true)
    setSmtpFormError(null)
    try {
      const result = await testSmtpSettings()
      setSmtp((current) =>
        current
          ? {
              ...current,
              testVerified: result.status === "success",
              lastTestStatus: result.status,
              lastTestAt: result.testedAt,
              lastTestError: result.error ?? null,
            }
          : current,
      )
      showSuccessToast("SMTP test delivered successfully.")
      await reloadTeam()
    } catch (testError) {
      const message = isIdentityApiError(testError)
        ? testError.message
        : "SMTP test failed."
      setSmtpFormError(message)
      await reloadTeam()
    } finally {
      setSmtpTesting(false)
    }
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault()
    setInviteError(null)
    setInviteSubmitting(true)
    try {
      await createInvitation({
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
      })
      setInviteOpen(false)
      setInviteName("")
      setInviteEmail("")
      setInviteRole("creative")
      showSuccessToast("Invitation sent.")
      await reloadTeam()
    } catch (submitError) {
      setInviteError(
        isIdentityApiError(submitError)
          ? submitError.message
          : "Could not send invitation.",
      )
    } finally {
      setInviteSubmitting(false)
    }
  }

  async function handleUserUpdate(userId: string, patch: { role?: UserRole; disabled?: boolean }) {
    try {
      await updateUser(userId, patch)
      showSuccessToast("User updated.")
      await reloadTeam()
    } catch (updateError) {
      showErrorToast(
        isIdentityApiError(updateError) ? updateError.message : "Could not update user.",
      )
    }
  }

  async function handleResend(invitationId: string) {
    try {
      await resendInvitation(invitationId)
      showSuccessToast("Invitation resent.")
      await reloadTeam()
    } catch (resendError) {
      showErrorToast(
        isIdentityApiError(resendError) ? resendError.message : "Could not resend invitation.",
      )
    }
  }

  async function handleRevoke(invitationId: string) {
    try {
      await revokeInvitation(invitationId)
      showSuccessToast("Invitation revoked.")
      await reloadTeam()
    } catch (revokeError) {
      showErrorToast(
        isIdentityApiError(revokeError) ? revokeError.message : "Could not revoke invitation.",
      )
    }
  }

  const canInvite = Boolean(smtp?.testVerified)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="space-y-2">
        <h2 className="type-page-title">Team</h2>
        <p className="text-muted-foreground">
          Manage studio members, invitations, and SMTP delivery for this self-hosted instance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SMTP configuration</CardTitle>
          <CardDescription>
            Configure your studio&apos;s email relay. Credentials are stored locally and never
            returned by the API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={(event) => void handleSaveSmtp(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP host</Label>
                <Input
                  id="smtp-host"
                  value={smtpHost}
                  onChange={(event) => setSmtpHost(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  value={smtpPort}
                  onChange={(event) => setSmtpPort(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-username">Username</Label>
                <Input
                  id="smtp-username"
                  value={smtpUsername}
                  onChange={(event) => setSmtpUsername(event.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-password">
                  Password{smtp?.passwordConfigured ? " (leave blank to keep current)" : ""}
                </Label>
                <Input
                  id="smtp-password"
                  type="password"
                  value={smtpPassword}
                  onChange={(event) => setSmtpPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-from">Sender email</Label>
                <Input
                  id="smtp-from"
                  type="email"
                  value={smtpFromEmail}
                  onChange={(event) => setSmtpFromEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-tls">TLS mode</Label>
                <Select value={smtpTlsMode} onValueChange={(value) => setSmtpTlsMode(value as SmtpTlsMode)}>
                  <SelectTrigger id="smtp-tls">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SMTP_TLS_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="smtp-instance-url">Instance URL</Label>
                <Input
                  id="smtp-instance-url"
                  value={smtpInstanceUrl}
                  onChange={(event) => setSmtpInstanceUrl(event.target.value)}
                  required
                />
              </div>
            </div>

            {smtpFormError ? (
              <p className="text-destructive text-sm">{smtpFormError}</p>
            ) : null}

            {smtp?.lastTestStatus === "failed" && smtp.lastTestError ? (
              <p className="text-destructive text-sm">Last test failed: {smtp.lastTestError}</p>
            ) : null}

            {smtp?.testVerified ? (
              <p className="text-muted-foreground text-sm">SMTP test verified.</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Run a successful SMTP test before sending invitations.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={smtpSaving}>
                {smtpSaving ? "Saving..." : "Save SMTP settings"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={smtpTesting || !smtp?.configured}
                onClick={() => void handleTestSmtp()}
              >
                {smtpTesting ? "Testing..." : "Send test email"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>Active studio accounts and roles.</CardDescription>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canInvite}>Invite member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a team member</DialogTitle>
                <DialogDescription>
                  Invitations are limited to Creative and Proofing roles.
                </DialogDescription>
              </DialogHeader>
              <form className="grid gap-4" onSubmit={(event) => void handleInvite(event)}>
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Name</Label>
                  <Input
                    id="invite-name"
                    value={inviteName}
                    onChange={(event) => setInviteName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) =>
                      setInviteRole(value as (typeof INVITABLE_ROLES)[number])
                    }
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVITABLE_ROLES.map((entry) => (
                        <SelectItem key={entry} value={entry}>
                          {ROLE_LABELS[entry]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">{ROLE_DESCRIPTIONS[inviteRole]}</p>
                </div>
                {inviteError ? <p className="text-destructive text-sm">{inviteError}</p> : null}
                <DialogFooter>
                  <Button type="submit" disabled={inviteSubmitting}>
                    {inviteSubmitting ? "Sending..." : "Send invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const badge = ROLE_BADGE_TOKENS[user.role]
                return (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(badge.className)}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.disabled ? "Disabled" : "Active"}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      {user.role !== "admin" ? (
                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            void handleUserUpdate(user.id, { role: value as UserRole })
                          }
                        >
                          <SelectTrigger className="inline-flex w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INVITABLE_ROLES.map((entry) => (
                              <SelectItem key={entry} value={entry}>
                                {ROLE_LABELS[entry]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void handleUserUpdate(user.id, { disabled: !user.disabled })
                        }
                      >
                        {user.disabled ? "Reactivate" : "Disable"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>Pending and historical invitation status.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {invitations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invitations yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.name}</TableCell>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>{ROLE_LABELS[invitation.role]}</TableCell>
                    <TableCell>{INVITE_STATUS_LABELS[invitation.status]}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      {["pending", "delivery_failed", "expired"].includes(invitation.status) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleResend(invitation.id)}
                        >
                          Resend
                        </Button>
                      ) : null}
                      {invitation.status === "pending" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleRevoke(invitation.id)}
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
