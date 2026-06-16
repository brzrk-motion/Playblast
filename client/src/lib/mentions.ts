export type CommentBodySegment =
  | { type: "text"; value: string }
  | { type: "mention"; value: string }

export interface MentionContext {
  query: string
  startIndex: number
}

export function buildMentionCandidates(
  commentAuthors: string[],
  currentAuthor?: string,
): string[] {
  const names = new Set<string>()

  for (const author of commentAuthors) {
    const trimmed = author.trim()
    if (trimmed) {
      names.add(trimmed)
    }
  }

  const current = currentAuthor?.trim()
  if (current) {
    names.add(current)
  }

  return [...names].sort((a, b) => a.localeCompare(b))
}

export function getMentionContext(
  text: string,
  cursorIndex: number,
): MentionContext | null {
  const before = text.slice(0, cursorIndex)
  const atIndex = before.lastIndexOf("@")
  if (atIndex === -1) {
    return null
  }

  if (atIndex > 0 && !/\s/.test(before[atIndex - 1]!)) {
    return null
  }

  const query = before.slice(atIndex + 1)
  if (query.includes("\n")) {
    return null
  }

  return { query, startIndex: atIndex }
}

export function filterMentionCandidates(
  candidates: string[],
  query: string,
): string[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return candidates
  }

  return candidates.filter((name) =>
    name.toLowerCase().includes(normalizedQuery),
  )
}

export function insertMention(
  text: string,
  mentionStartIndex: number,
  cursorIndex: number,
  name: string,
): { text: string; cursorIndex: number } {
  const before = text.slice(0, mentionStartIndex)
  const after = text.slice(cursorIndex)
  const inserted = `@${name} `

  return {
    text: before + inserted + after,
    cursorIndex: mentionStartIndex + inserted.length,
  }
}

export function parseCommentBodyWithMentions(
  body: string,
  knownNames: string[],
): CommentBodySegment[] {
  if (!knownNames.length) {
    return body ? [{ type: "text", value: body }] : []
  }

  const sortedNames = [...knownNames].sort((a, b) => b.length - a.length)
  const segments: CommentBodySegment[] = []
  let index = 0

  while (index < body.length) {
    if (body[index] === "@") {
      let matchedName: string | null = null

      for (const name of sortedNames) {
        if (!body.slice(index + 1).startsWith(name)) {
          continue
        }

        const nextChar = body[index + 1 + name.length]
        if (nextChar === undefined || /[\s.,!?;:()[\]{}"']/.test(nextChar)) {
          matchedName = name
          break
        }
      }

      if (matchedName) {
        segments.push({ type: "mention", value: matchedName })
        index += 1 + matchedName.length
        continue
      }
    }

    const nextAt = body.indexOf("@", index + 1)
    const end = nextAt === -1 ? body.length : nextAt
    const text = body.slice(index, end)
    if (text) {
      segments.push({ type: "text", value: text })
    }
    index = end
  }

  return segments
}
