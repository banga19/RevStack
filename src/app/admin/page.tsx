"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  _count: { onboardingResponses: number }
}

export default function AdminPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user) return
    if (session.user.role !== "admin") {
      router.push("/dashboard")
      return
    }
    loadUsers()
  }, [session, router])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/dashboard")
          return
        }
        throw new Error("Failed to load users")
      }
      const data = await res.json()
      setUsers(data)
    } catch (e) {
      setError("Could not load users")
    } finally {
      setLoading(false)
    }
  }

  const updateRole = async (userId: string, role: string) => {
    setUpdating(userId)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Failed to update role")
        return
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      )
      // Refresh session if updating own role
      if (userId === session?.user?.id) {
        update()
      }
    } catch (e) {
      alert("Failed to update role")
    } finally {
      setUpdating(null)
    }
  }

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
          <p className="text-muted-foreground mt-1">Manage users and roles</p>
        </div>
        <Button variant="outline" onClick={loadUsers} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Users
          </CardTitle>
          <CardDescription>
            {users.length} registered user{users.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="shimmer h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="shimmer h-4 w-32 rounded" />
                    <div className="shimmer h-3 w-48 rounded" />
                  </div>
                  <div className="shimmer h-8 w-24 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
              <p className="text-muted-foreground">{error}</p>
              <Button variant="outline" className="mt-4" onClick={loadUsers}>
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header row */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">User</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Onboarding</div>
                <div className="col-span-2">Joined</div>
                <div className="col-span-2">Actions</div>
              </div>

              {users.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors items-center"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-xs shrink-0">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                      className={cn(
                        user.role === "admin" && "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      {user.role === "admin" ? (
                        <Shield className="h-3 w-3 mr-1" />
                      ) : (
                        <Users className="h-3 w-3 mr-1" />
                      )}
                      {user.role === "admin" ? "Admin" : "User"}
                    </Badge>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5">
                      {user._count.onboardingResponses > 0 ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {user._count.onboardingResponses > 0 ? "Completed" : "Pending"}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.role}
                        onValueChange={(v) => updateRole(user.id, v)}
                        disabled={updating === user.id}
                      >
                        <SelectTrigger className="h-8 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {updating === user.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
