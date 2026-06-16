import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"

import {
  filterMentionCandidates,
  getMentionContext,
  insertMention,
} from "@/lib/mentions"
import { cn } from "@/lib/utils"

export interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  mentionCandidates: string[]
  className?: string
  disabled?: boolean
  rows?: number
  placeholder?: string
  "aria-label"?: string
  "aria-invalid"?: boolean
  autoFocus?: boolean
  onEscape?: () => void
  onSubmit?: () => void
}

export function MentionTextarea({
  value,
  onChange,
  mentionCandidates,
  className,
  disabled = false,
  rows = 2,
  placeholder,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  autoFocus = false,
  onEscape,
  onSubmit,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [cursorIndex, setCursorIndex] = useState(0)

  const mentionContext = useMemo(
    () => getMentionContext(value, cursorIndex),
    [value, cursorIndex],
  )

  const filteredCandidates = useMemo(() => {
    if (!mentionContext || mentionCandidates.length === 0) {
      return []
    }

    return filterMentionCandidates(mentionCandidates, mentionContext.query)
  }, [mentionCandidates, mentionContext])
  const mentionMenuKey = mentionContext
    ? `${mentionContext.startIndex}:${mentionContext.query}:${filteredCandidates.join("\0")}`
    : null
  const [menuNavigation, setMenuNavigation] = useState({ key: "", index: 0 })
  const selectedIndex =
    mentionMenuKey && menuNavigation.key === mentionMenuKey
      ? menuNavigation.index
      : 0

  const mentionMenuOpen =
    Boolean(mentionContext) && filteredCandidates.length > 0

  function setSelectedIndex(
    index: number | ((current: number) => number),
  ) {
    if (!mentionMenuKey) {
      return
    }

    setMenuNavigation((current) => ({
      key: mentionMenuKey,
      index:
        typeof index === "function"
          ? index(current.key === mentionMenuKey ? current.index : 0)
          : index,
    }))
  }

  useEffect(() => {
    if (!mentionMenuOpen) {
      return
    }

    const selectedItem = listRef.current?.children[selectedIndex] as
      | HTMLElement
      | undefined
    selectedItem?.scrollIntoView({ block: "nearest" })
  }, [mentionMenuOpen, selectedIndex])

  function updateCursorFromTarget(target: HTMLTextAreaElement) {
    setCursorIndex(target.selectionStart ?? 0)
  }

  function selectCandidate(name: string) {
    if (!mentionContext || !textareaRef.current) {
      return
    }

    const { text, cursorIndex: nextCursorIndex } = insertMention(
      value,
      mentionContext.startIndex,
      cursorIndex,
      name,
    )

    onChange(text)
    setCursorIndex(nextCursorIndex)

    requestAnimationFrame(() => {
      const textarea = textareaRef.current
      if (!textarea) {
        return
      }

      textarea.focus()
      textarea.setSelectionRange(nextCursorIndex, nextCursorIndex)
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionMenuOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setSelectedIndex((current) =>
          current + 1 >= filteredCandidates.length ? 0 : current + 1,
        )
        return
      }

      if (event.key === "ArrowUp") {
        event.preventDefault()
        setSelectedIndex((current) =>
          current - 1 < 0 ? filteredCandidates.length - 1 : current - 1,
        )
        return
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault()
        const selectedName = filteredCandidates[selectedIndex]
        if (selectedName) {
          selectCandidate(selectedName)
        }
        return
      }

      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        return
      }
    }

    if (event.key === "Escape") {
      event.preventDefault()
      onEscape?.()
      return
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      onSubmit?.()
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          updateCursorFromTarget(event.target)
        }}
        onClick={(event) => updateCursorFromTarget(event.currentTarget)}
        onKeyUp={(event) => updateCursorFromTarget(event.currentTarget)}
        onSelect={(event) => updateCursorFromTarget(event.currentTarget)}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        rows={rows}
        disabled={disabled}
        className={className}
      />

      {mentionMenuOpen ? (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Mention suggestions"
          className="absolute bottom-full left-0 z-50 mb-1 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
        >
          {filteredCandidates.map((name, index) => (
            <li key={name} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                className={cn(
                  "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/60",
                )}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectCandidate(name)
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="font-medium text-primary">@</span>
                <span className="truncate">{name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
