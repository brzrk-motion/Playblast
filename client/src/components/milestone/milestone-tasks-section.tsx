import { useMemo, useState } from "react"
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { TaskTimeLogControl } from "@/components/milestone/task-time-log-control"
import { createTask, deleteTask, updateTask } from "@/lib/api"
import { humanizeApiError, showErrorToast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import type { Task } from "@/types/task"

interface MilestoneTasksSectionProps {
  milestoneId: string
  tasks: Task[]
  onTasksChange: (milestoneId: string, tasks: Task[]) => void
}

export function MilestoneTasksSection({
  milestoneId,
  tasks,
  onTasksChange,
}: MilestoneTasksSectionProps) {
  const [newTaskName, setNewTaskName] = useState("")
  const [adding, setAdding] = useState(false)
  const [taskHours, setTaskHours] = useState<Record<string, number>>({})

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.order - b.order),
    [tasks],
  )

  async function handleAddTask(event: React.FormEvent) {
    event.preventDefault()
    if (!newTaskName.trim()) return

    setAdding(true)
    try {
      const task = await createTask(milestoneId, { name: newTaskName.trim() })
      onTasksChange(milestoneId, [...tasks, task])
      setNewTaskName("")
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to add task"))
    } finally {
      setAdding(false)
    }
  }

  async function handleToggleTask(task: Task) {
    try {
      const updated = await updateTask(task.id, { done: !task.done })
      onTasksChange(
        milestoneId,
        tasks.map((item) => (item.id === task.id ? updated : item)),
      )
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to update task"))
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      await deleteTask(taskId)
      onTasksChange(
        milestoneId,
        tasks.filter((item) => item.id !== taskId),
      )
      setTaskHours((current) => {
        const next = { ...current }
        delete next[taskId]
        return next
      })
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to delete task"))
    }
  }

  return (
    <div className="ml-8 space-y-1 border-l pl-3">
      {sortedTasks.map((task) => (
        <div
          key={task.id}
          className="interactive-row flex items-center gap-2 rounded-lg px-2 py-1"
        >
          <button
            type="button"
            onClick={() => void handleToggleTask(task)}
            className="focus-ring rounded-full"
            aria-label={task.done ? "Mark task incomplete" : "Mark task complete"}
          >
            {task.done ? (
              <CheckCircle2 className="size-4 text-status-success-foreground" />
            ) : (
              <Circle className="size-4 text-muted-foreground" />
            )}
          </button>
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              task.done && "text-muted-foreground line-through",
            )}
          >
            {task.name}
          </p>
          <TaskTimeLogControl
            taskId={task.id}
            totalHours={taskHours[task.id]}
            onTotalHoursChange={(hours) =>
              setTaskHours((current) => ({ ...current, [task.id]: hours }))
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => void handleDeleteTask(task.id)}
            aria-label="Delete task"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}

      <form
        className="flex items-center gap-2 px-2 py-1"
        onSubmit={(event) => void handleAddTask(event)}
      >
        <Input
          value={newTaskName}
          onChange={(event) => setNewTaskName(event.target.value)}
          placeholder="Add a task…"
          disabled={adding}
          className="h-8"
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={adding || !newTaskName.trim()}
          aria-label="Add task"
        >
          {adding ? <Spinner className="size-4" /> : <Plus className="size-4" />}
        </Button>
      </form>
    </div>
  )
}
