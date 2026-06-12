import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { isTextEntryElement, shouldSuppressGlobalShortcut } from "./keyboard-guard"

class MockElement {
  tagName: string
  isContentEditable = false
  parent: MockElement | null = null

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase()
  }

  matches(selector: string): boolean {
    if (selector.includes("input")) {
      return this.tagName === "INPUT"
    }
    if (selector.includes("textarea")) {
      return this.tagName === "TEXTAREA"
    }
    if (selector.includes("select")) {
      return this.tagName === "SELECT"
    }
    if (selector.includes("contenteditable")) {
      return this.isContentEditable
    }
    return false
  }

  closest(selector: string): MockElement | null {
    if (this.matches(selector)) {
      return this
    }

    return this.parent?.closest(selector) ?? null
  }
}

function mockEvent(target: MockElement | null) {
  return { target } as unknown as KeyboardEvent
}

describe("isTextEntryElement", () => {
  it("detects native text entry tags", () => {
    const input = new MockElement("input") as unknown as HTMLElement
    const textarea = new MockElement("textarea") as unknown as HTMLElement
    const div = new MockElement("div") as unknown as HTMLElement

    assert.equal(isTextEntryElement(input), true)
    assert.equal(isTextEntryElement(textarea), true)
    assert.equal(isTextEntryElement(div), false)
  })

  it("detects contenteditable elements", () => {
    const editable = new MockElement("div") as unknown as HTMLElement
    ;(editable as unknown as MockElement).isContentEditable = true

    assert.equal(isTextEntryElement(editable), true)
  })
})

describe("shouldSuppressGlobalShortcut", () => {
  it("suppresses shortcuts when a text field is focused", () => {
    const textarea = new MockElement("textarea") as unknown as HTMLElement
    const body = new MockElement("body") as unknown as HTMLElement

    assert.equal(
      shouldSuppressGlobalShortcut(mockEvent(body), textarea),
      true,
    )
  })

  it("suppresses shortcuts when the event target is a text field", () => {
    const textarea = new MockElement("textarea") as unknown as HTMLElement

    assert.equal(
      shouldSuppressGlobalShortcut(mockEvent(textarea), null),
      true,
    )
  })

  it("allows shortcuts when focus is outside text entry controls", () => {
    const body = new MockElement("body") as unknown as HTMLElement

    assert.equal(
      shouldSuppressGlobalShortcut(mockEvent(body), body),
      false,
    )
  })
})
