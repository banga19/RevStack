"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  CalendarCheck,
  CircleCheck,
  CircleDot,
  Clock,
  AlertTriangle,
  ArrowUp,
  Target,
  ListChecks,
  ChevronDown,
  ChevronRight,
  Filter,
} from "lucide-react"

type PlanTask = {
  id: string
  day: number
  title: string
  description: string | null
  phase: string
  category: string
  status: string
  priority: string
  completedAt: string | null
}

export default function PlanPage() {
  const [tasks, setTasks] = useState<PlanTask[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())
  const [phaseFilter, setPhaseFilter] = useState<string>("all")

  useEffect(() => {
    fetch("/api/plan")
      .then((r) => r.json())
      .then((d) => {
        setTasks(d)
        setLoading(false)
        // Auto-expand first 5 days
        const initial = new Set<number>()
        for (let i = 1; i <= 5; i++) initial.add(i)
        setExpandedDays(initial)
      })
      .catch(() => setLoading(false))
  }, [])

  const toggleDay = (day: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  const allPhases = Array.from(new Set(tasks.map((t) => t.phase)))
  const filteredTasks = phaseFilter === "all" ? tasks : tasks.filter((t) => t.phase === phaseFilter)

  // Group by day
  const groupedByDay: Record<number, PlanTask[]> = {}
  for (const task of filteredTasks) {
    if (!groupedByDay[task.day]) groupedByDay[task.day] = []
    groupedByDay[task.day].push(task)
  }

  const dayNumbers = Object.keys(groupedByDay).map(Number).sort((a, b) => a - b)
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === "completed").length
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length
  const completion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const getPhaseColor = (phase: string) => {
    const colors: Record<string, string> = {
      foundation: "bg-blue-500/10 text-blue-600 border-blue-200",
      anchor: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
      growth: "bg-amber-500/10 text-amber-600 border-amber-200",
      scale: "bg-purple-500/10 text-purple-600 border-purple-200",
    }
    return colors[phase] || "bg-gray-500/10 text-gray-600 border-gray-200"
  }

  const getPriorityColor = (p: string) => {
    const colors: Record<string, string> = {
      critical: "text-red-500",
      high: "text-amber-500",
      medium: "text-blue-500",
      low: "text-muted-foreground",
    }
    return colors[p] || "text-muted-foreground"
  }

  const getStatusIcon = (status: string) => {
    if (status === "completed") return <CircleCheck className="h-5 w-5 text-emerald-500" />
    if (status === "in-progress") return <Clock className="h-5 w-5 text-blue-500 animate-pulse-soft" />
    return <CircleDot className="h-5 w-5 text-muted-foreground/50" />
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="shimmer h-8 w-64 rounded mb-2" />
        <div className="shimmer h-4 w-96 rounded mb-8" />
        <div className="shimmer h-64 w-full rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">75-Day Plan</h1>
          <p className="text-muted-foreground mt-1">
            Track your daily execution to $22,500/month
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success" className="text-sm px-3 py-1">
            <ListChecks className="h-3.5 w-3.5 mr-1" />
            {completedTasks}/{totalTasks} done
          </Badge>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{completion}%</div>
              <div className="text-xs text-muted-foreground">Overall Progress</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CircleCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{completedTasks}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{inProgressTasks}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalTasks - completedTasks - inProgressTasks}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">75-Day Execution</span>
            <span className="text-sm text-muted-foreground">Day {dayNumbers.length} / 75</span>
          </div>
          <Progress value={completion} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Foundation</span>
            <span>Anchor</span>
            <span>Growth</span>
            <span>Scale</span>
          </div>
        </CardContent>
      </Card>

      {/* Phase Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={phaseFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setPhaseFilter("all")}
        >
          All
        </Button>
        {allPhases.map((phase) => (
          <Button
            key={phase}
            variant={phaseFilter === phase ? "default" : "outline"}
            size="sm"
            onClick={() => setPhaseFilter(phase)}
            className="capitalize"
          >
            {phase}
          </Button>
        ))}
      </div>

      {/* Day Timeline */}
      <div className="space-y-2">
        {dayNumbers.map((day, idx) => {
          const dayTasks = groupedByDay[day]
          const dayCompleted = dayTasks.filter((t) => t.status === "completed").length
          const dayProgress = dayTasks.length > 0 ? Math.round((dayCompleted / dayTasks.length) * 100) : 0
          const isExpanded = expandedDays.has(day)

          return (
            <Card
              key={day}
              className={cn(
                "transition-all duration-200 cursor-pointer hover:shadow-md",
                isExpanded && "ring-1 ring-primary/20"
              )}
              onClick={() => toggleDay(day)}
            >
              <CardContent className="p-4">
                {/* Day Header */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                    {day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Day {day}</span>
                      {dayTasks[0] && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 capitalize", getPhaseColor(dayTasks[0].phase))}>
                          {dayTasks[0].phase}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={dayProgress} className="h-1.5 w-24" />
                      <span className="text-xs text-muted-foreground">{dayCompleted}/{dayTasks.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="hidden sm:inline">{dayCompleted}/{dayTasks.length} tasks</span>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded Tasks */}
                {isExpanded && (
                  <div className="mt-4 space-y-2 ml-14">
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg transition-colors",
                          task.status === "completed" ? "bg-muted/30" : "bg-muted/10 hover:bg-muted/20"
                        )}
                      >
                        {getStatusIcon(task.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-sm font-medium",
                              task.status === "completed" && "line-through text-muted-foreground"
                            )}>
                              {task.title}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                              {task.category}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                          )}
                        </div>
                        <div className={cn("text-xs font-medium flex items-center gap-1", getPriorityColor(task.priority))}>
                          <ArrowUp className="h-3 w-3" />
                          {task.priority}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
