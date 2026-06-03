"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Shield,
  Users,
  ShieldAlert,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  CreditCard,
  MessageSquare,
  Mail,
  BellRing,
  Play,
  Smartphone,
  Activity,
  Zap,
  Brain,
  Square,
  Pause,
  Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  _count: { onboardingResponses: number }
}

interface AdminStats {
  totalUsers: number
  activeSubscriptions: number
  trialUsers: number
  totalPayments: number
  successfulPayments: number
  totalRevenue: number
}

interface AdminPayment {
  id: string
  amount: number
  currency: string
  method: string
  status: string
  tier: string | null
  plan: string | null
  user: { name: string; email: string }
  createdAt: string
}

interface AdminTrialUser {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  tier: string | null
  trialStartsAt: string | null
  trialEndsAt: string | null
  createdAt: string
  followUpCount: number
  paymentCount: number
}

interface AdminFollowUp {
  id: string
  user: { name: string; email: string }
  type: string
  stage: string
  sentAt: string
}

interface AdminData {
  stats: AdminStats
  payments: AdminPayment[]
  trialUsers: AdminTrialUser[]
  followUpLogs: AdminFollowUp[]
}

// ---------------------------------------------------------------------------
// Follow-up stage display
// ---------------------------------------------------------------------------

const STAGE_LABELS: Record<string, string> = {
  "day-10": "Day 10 (4 days left)",
  "day-13": "Day 13 (1 day left)",
  "day-14": "Day 14 (last day)",
  "d+3": "D+3 (expired)",
  "d+7": "D+7 (final offer)",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminDataLoading, setAdminDataLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("users")
  const [runningFollowups, setRunningFollowups] = useState(false)
  const [triggeringUser, setTriggeringUser] = useState<string | null>(null)

  // God Mode state
  const [godModeSessions, setGodModeSessions] = useState<any[]>([])
  const [godModeReports, setGodModeReports] = useState<any[]>([])
  const [godModeStatus, setGodModeStatus] = useState<any>(null)
  const [godModeLoading, setGodModeLoading] = useState(false)
  const [startingGodMode, setStartingGodMode] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setAdminDataLoading(true)
    setError(null)
    try {
      const [usersRes, dataRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/data"),
      ])

      if (!usersRes.ok) {
        if (usersRes.status === 401) { router.push("/dashboard"); return }
        throw new Error("Failed to load data")
      }

      const usersData = await usersRes.json()
      setUsers(usersData)

      if (dataRes.ok) {
        const dataData = await dataRes.json()
        setAdminData(dataData)
      }
    } catch (e) {
      setError("Could not load admin data")
    } finally {
      setLoading(false)
      setAdminDataLoading(false)
    }
  }, [router])

  // Load God Mode sessions
  const loadGodMode = useCallback(async () => {
    setGodModeLoading(true)
    try {
      const res = await fetch("/api/god-mode")
      if (res.ok) {
        const data = await res.json()
        setGodModeSessions(data.sessions || [])
        setGodModeReports(data.reports || [])
        setGodModeStatus(data.agentStatus || null)
      }
    } catch (e) {
      console.error("Failed to load God Mode:", e)
    } finally {
      setGodModeLoading(false)
    }
  }, [])

  const handleGodModeControl = async (sessionId: string, action: "pause" | "resume" | "stop") => {
    try {
      await fetch("/api/god-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action }),
      })
      loadGodMode()
    } catch (e) {
      console.error(`Failed to ${action} God Mode:`, e)
    }
  }

  const handleStartGodMode = async () => {
    setStartingGodMode(true)
    try {
      await fetch("/api/god-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: 3600000,
          objective: "Full system sweep — all agents, all pending tasks",
          agents: ["lead", "trade", "compliance", "onboarding", "revenue"],
        }),
      })
      loadGodMode()
    } catch (e) {
      console.error("Failed to start God Mode:", e)
    } finally {
      setStartingGodMode(false)
    }
  }

  useEffect(() => {
    if (!session?.user) return
    if (session.user.role !== "admin") { router.push("/dashboard"); return }
    loadAll()
  }, [session, router, loadAll])

  // ---- User role management ----
  const updateRole = async (userId: string, role: string) => {
    setUpdating(userId)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      })
      if (!res.ok) { const d = await res.json(); alert(d.error || "Failed"); return }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
      if (userId === session?.user?.id) update()
    } catch { alert("Failed to update role") }
    finally { setUpdating(null) }
  }

  // ---- Run all follow-ups ----
  const handleRunAllFollowups = async () => {
    setRunningFollowups(true)
    try {
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run-all-followups" }),
      })
      const data = await res.json()
      alert(`Follow-ups processed: ${data.processed} users, ${data.sent} messages sent, ${data.errors} errors`)
      loadAll()
    } catch { alert("Failed to run follow-ups") }
    finally { setRunningFollowups(false) }
  }

  // ---- Trigger follow-up for specific user ----
  const handleTriggerFollowup = async (userId: string, stageId: string) => {
    setTriggeringUser(`${userId}-${stageId}`)
    try {
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger-followup", userId, stageId }),
      })
      const data = await res.json()
      if (data.success) {
        loadAll()
      } else {
        alert("Failed to send follow-up")
      }
    } catch { alert("Failed to trigger follow-up") }
    finally { setTriggeringUser(null) }
  }

  // ---- Auth guard ----
  if (!session?.user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (session.user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You do not have admin privileges.</p>
        <Button className="mt-6" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">Manage users, payments, and subscription follow-ups</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRunAllFollowups}
            disabled={runningFollowups || adminDataLoading}
          >
            {runningFollowups ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
            ) : (
              <><Play className="h-4 w-4 mr-2" /> Run Follow-ups</>
            )}
          </Button>
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {adminData && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
              <div>
                <div className="text-xl font-bold">{adminData.stats.totalUsers}</div>
                <div className="text-[10px] text-muted-foreground">Total Users</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <div className="text-xl font-bold">{adminData.stats.activeSubscriptions}</div>
                <div className="text-[10px] text-muted-foreground">Active Subs</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="h-5 w-5 text-amber-500" /></div>
              <div>
                <div className="text-xl font-bold">{adminData.stats.trialUsers}</div>
                <div className="text-[10px] text-muted-foreground">On Trial</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><CreditCard className="h-5 w-5 text-blue-500" /></div>
              <div>
                <div className="text-xl font-bold">{adminData.stats.totalPayments}</div>
                <div className="text-[10px] text-muted-foreground">Total Payments</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <div className="text-xl font-bold">{adminData.stats.successfulPayments}</div>
                <div className="text-[10px] text-muted-foreground">Successful</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><DollarSign className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <div className="text-xl font-bold">${(adminData.stats.totalRevenue || 0).toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">Total Revenue</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" /> Users</TabsTrigger>
          <TabsTrigger value="payments"><DollarSign className="h-4 w-4 mr-2" /> Payments</TabsTrigger>
          <TabsTrigger value="trials"><Clock className="h-4 w-4 mr-2" /> Trial Users</TabsTrigger>
          <TabsTrigger value="followups"><BellRing className="h-4 w-4 mr-2" /> Follow-ups</TabsTrigger>
          <TabsTrigger value="godmode"><Zap className="h-4 w-4 mr-2" /> God Mode</TabsTrigger>
        </TabsList>

{/* ================================================================= */}
{/* TAB: Users */}
{/* ================================================================= */}
<TabsContent value="users" className="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Users</CardTitle>
      <CardDescription>{users.length} registered user{users.length !== 1 ? "s" : ""}</CardDescription>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
              <div className="shimmer h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2"><div className="shimmer h-4 w-32 rounded" /><div className="shimmer h-3 w-48 rounded" /></div>
              <div className="shimmer h-8 w-24 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-10"><Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" /><p className="text-muted-foreground">No users found</p></div>
      ) : (
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-4">User</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Onboarding</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-2">Actions</div>
          </div>
          {users.map((user) => (
            <div key={user.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors items-center">
              <div className="col-span-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-xs shrink-0">
                  {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <div className="col-span-2">
                <Badge variant={user.role === "admin" ? "default" : "secondary"} className={cn(user.role === "admin" && "bg-primary/10 text-primary")}>
                  {user.role === "admin" ? <Shield className="h-3 w-3 mr-1" /> : <Users className="h-3 w-3 mr-1" />}
                  {user.role === "admin" ? "Admin" : "User"}
                </Badge>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-1.5">
                  {user._count.onboardingResponses > 0 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">{user._count.onboardingResponses > 0 ? "Completed" : "Pending"}</span>
                </div>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <Select value={user.role} onValueChange={(v) => updateRole(user.id, v)} disabled={updating === user.id}>
                    <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {updating === user.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>

{/* ================================================================= */}
{/* TAB: Payments */}
{/* ================================================================= */}
<TabsContent value="payments" className="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Payment History</CardTitle>
      <CardDescription>Recent payment transactions processed via Flutterwave</CardDescription>
    </CardHeader>
    <CardContent>
      {adminDataLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="shimmer h-12 w-full rounded" />)}</div>
      ) : adminData && adminData.payments.length === 0 ? (
        <div className="text-center py-10"><CreditCard className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" /><p className="text-muted-foreground">No payments yet</p></div>
      ) : (
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3">User</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Method</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Plan</div>
            <div className="col-span-1">Date</div>
          </div>
          {adminData?.payments.map((p) => (
            <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors items-center">
              <div className="col-span-3">
                <p className="text-sm font-medium truncate">{p.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.user.email}</p>
              </div>
              <div className="col-span-2">
                <span className="font-bold">${p.amount}</span>
                <span className="text-xs text-muted-foreground ml-1">{p.currency}</span>
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                {p.method === "mpesa" ? <Smartphone className="h-3.5 w-3.5 text-green-600" /> : p.method === "card" ? <CreditCard className="h-3.5 w-3.5 text-blue-600" /> : <DollarSign className="h-3.5 w-3.5 text-amber-600" />}
                <span className="text-sm capitalize">{p.method.replace("_", " ")}</span>
              </div>
              <div className="col-span-2">
                <Badge variant={p.status === "success" ? "default" : p.status === "pending" ? "outline" : "destructive"} className={cn("text-[10px]", p.status === "success" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30")}>
                  {p.status}
                </Badge>
              </div>
              <div className="col-span-2">
                <span className="text-sm capitalize">{p.tier || "—"} {p.plan ? `(${p.plan})` : ""}</span>
              </div>
              <div className="col-span-1">
                <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>

{/* ================================================================= */}
{/* TAB: Trial Users */}
{/* ================================================================= */}
<TabsContent value="trials" className="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-amber-500" /> Trial Users</CardTitle>
      <CardDescription>Users on trial or expired — each can be manually sent a follow-up</CardDescription>
    </CardHeader>
    <CardContent>
      {adminDataLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="shimmer h-16 w-full rounded" />)}</div>
      ) : adminData && adminData.trialUsers.length === 0 ? (
        <div className="text-center py-10"><Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" /><p className="text-muted-foreground">No users on trial</p></div>
      ) : (
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3">User</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Trial Ends</div>
            <div className="col-span-2">Follow-ups</div>
            <div className="col-span-3">Actions</div>
          </div>
          {adminData?.trialUsers.map((u) => {
            const daysLeft = u.trialEndsAt
              ? Math.ceil((new Date(u.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : 0
            return (
              <div key={u.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors items-center">
                <div className="col-span-3">
                  <p className="text-sm font-medium truncate flex items-center gap-1.5">
                    {u.name}
                    {u.phone && <Smartphone className="h-3 w-3 text-muted-foreground" />}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="col-span-2">
                  <Badge variant={u.status === "trial" ? "outline" : "destructive"} className="text-[10px]">
                    {u.status === "trial" ? (daysLeft > 0 ? `${daysLeft}d left` : "Expiring") : "Expired"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-sm text-muted-foreground">
                    {u.trialEndsAt ? new Date(u.trialEndsAt).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-sm text-muted-foreground">
                    {u.followUpCount} sent
                  </span>
                </div>
                <div className="col-span-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {["day-10", "day-13", "day-14", "d+3", "d+7"].map((stage) => (
                      <Button
                        key={stage}
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-1.5"
                        disabled={triggeringUser === `${u.id}-${stage}`}
                        onClick={() => handleTriggerFollowup(u.id, stage)}
                        title={`Send ${STAGE_LABELS[stage] || stage}`}
                      >
                        {triggeringUser === `${u.id}-${stage}` ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <>{stage.split("-")[0] === "d" ? stage : stage.replace("day-", "D")}</>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>

{/* ================================================================= */}
{/* TAB: Follow-up Logs */}
{/* ================================================================= */}
<TabsContent value="followups" className="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /> Follow-up Log</CardTitle>
      <CardDescription>Recent follow-up messages sent to trial users</CardDescription>
    </CardHeader>
    <CardContent>
      {adminDataLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="shimmer h-12 w-full rounded" />)}</div>
      ) : adminData && adminData.followUpLogs.length === 0 ? (
        <div className="text-center py-10"><BellRing className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" /><p className="text-muted-foreground">No follow-ups sent yet</p></div>
      ) : (
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3">User</div>
            <div className="col-span-3">Stage</div>
            <div className="col-span-2">Channel</div>
            <div className="col-span-2">Sent At</div>
            <div className="col-span-2">Status</div>
          </div>
          {adminData?.followUpLogs.map((log) => (
            <div key={log.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors items-center">
              <div className="col-span-3">
                <p className="text-sm font-medium truncate">{log.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{log.user.email}</p>
              </div>
              <div className="col-span-3">
                <span className="text-sm">{STAGE_LABELS[log.stage] || log.stage}</span>
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                {log.type === "email" ? <Mail className="h-3.5 w-3.5 text-blue-500" /> : <MessageSquare className="h-3.5 w-3.5 text-green-500" />}
                <span className="text-sm capitalize">{log.type}</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">{new Date(log.sentAt).toLocaleString()}</span>
              </div>
              <div className="col-span-2">
                <Badge variant="default" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">Delivered</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>

{/* ================================================================= */}
{/* TAB: God Mode */}
{/* ================================================================= */}
<TabsContent value="godmode" className="space-y-4">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <div>
        <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" /> God Mode — Autonomous Agents</CardTitle>
        <CardDescription>Admin super access to the AI agent orchestrator. Start, pause, and monitor autonomous agents.</CardDescription>
      </div>
      <Button
        onClick={() => {
          handleStartGodMode()
        }}
        disabled={startingGodMode || godModeSessions.some((s: any) => s.status === "running")}
      >
        {startingGodMode ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting...</>
        ) : (
          <><Zap className="h-4 w-4 mr-2" /> Start Full God Mode</>
        )}
      </Button>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Agent Status Grid */}
      <div className="grid gap-3 md:grid-cols-5">
        {[
          { id: "lead", label: "Lead Agent", icon: <Users className="h-4 w-4" />, color: "text-blue-500 bg-blue-500/10", desc: "Qualifies leads & follow-ups" },
          { id: "trade", label: "Trade Agent", icon: <Globe className="h-4 w-4" />, color: "text-emerald-500 bg-emerald-500/10", desc: "Corridors & matching" },
          { id: "compliance", label: "Compliance Agent", icon: <Shield className="h-4 w-4" />, color: "text-amber-500 bg-amber-500/10", desc: "Certifications & expiry" },
          { id: "onboarding", label: "Onboarding Agent", icon: <Users className="h-4 w-4" />, color: "text-purple-500 bg-purple-500/10", desc: "Client onboarding" },
          { id: "revenue", label: "Revenue Agent", icon: <DollarSign className="h-4 w-4" />, color: "text-emerald-500 bg-emerald-500/10", desc: "Revenue & invoicing" },
        ].map((agent: any) => {
          const isRunning = godModeSessions.some((s: any) => s.status === "running" && s.currentAgent === agent.id)
          return (
            <div key={agent.id} className={cn("p-3 rounded-lg border text-center transition-all", isRunning ? "border-primary/40 bg-primary/5" : "border-border/50")}>
              <div className={cn("p-2 rounded-lg inline-flex mb-2", agent.color)}>
                {agent.icon}
              </div>
              <p className="text-xs font-medium">{agent.label}</p>
              <p className="text-[10px] text-muted-foreground">{agent.desc}</p>
              <div className={cn("mt-2 w-2 h-2 rounded-full mx-auto", isRunning ? "bg-emerald-500 animate-pulse" : "bg-muted")} />
            </div>
          )
        })}
      </div>

      {/* Active Sessions */}
      {godModeSessions.filter((s: any) => s.status === "running" || s.status === "paused").map((session: any) => (
        <div key={session.id} className="p-4 rounded-lg border bg-muted/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className={cn("h-4 w-4", session.status === "running" ? "text-primary animate-pulse" : "text-amber-500")} />
              <span className="text-sm font-medium capitalize">{session.status}</span>
              <span className="text-xs text-muted-foreground">{session.config.objective}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{session.progress}%</Badge>
              {session.status === "running" ? (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleGodModeControl(session.id, "pause")}>
                  <Pause className="h-3 w-3 mr-1" /> Pause
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleGodModeControl(session.id, "resume")}>
                  <Play className="h-3 w-3 mr-1" /> Resume
                </Button>
              )}
              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleGodModeControl(session.id, "stop")}>
                <Square className="h-3 w-3 mr-1" /> Stop
              </Button>
            </div>
          </div>
          <Progress value={session.progress} className="h-1.5" />
          <div className="mt-3 space-y-1.5">
            {session.tasks.slice(0, 5).map((task: any) => (
              <div key={task.id} className="flex items-center gap-2 text-xs">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                  task.status === "completed" ? "bg-emerald-500" :
                  task.status === "running" ? "bg-primary animate-pulse" :
                  task.status === "failed" ? "bg-red-500" : "bg-muted"
                )} />
                <span className="text-muted-foreground">{task.action}</span>
                <Badge variant="outline" className="text-[9px] ml-auto capitalize">{task.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Reports */}
      {godModeReports.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Agent Reports</h4>
          <div className="space-y-2">
            {godModeReports.slice(0, 5).map((report: any) => (
              <div key={report.id} className="p-3 rounded-lg border bg-card/50">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] capitalize">{report.agentType}</Badge>
                  <span className="text-xs font-medium">{report.title}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{new Date(report.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{report.summary}</p>
                {report.insights.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {report.insights.slice(0, 3).map((insight: string, i: number) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{insight}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {godModeSessions.filter((s: any) => s.status === "running" || s.status === "paused").length === 0 && godModeReports.length === 0 && (
        <div className="text-center py-8">
          <Brain className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No active God Mode sessions. Click "Start Full God Mode" to launch all 5 autonomous agents.</p>
          <Button variant="outline" className="mt-4" onClick={loadGodMode}>
            <RefreshCw className={cn("h-4 w-4 mr-2", godModeLoading && "animate-spin")} />
            Refresh Status
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>
      </Tabs>
    </div>
  )
}
