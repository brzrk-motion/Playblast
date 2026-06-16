import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  buildMentionCandidates,
  filterMentionCandidates,
  getMentionContext,
  insertMention,
  parseCommentBodyWithMentions,
} from "./mentions"

describe("buildMentionCandidates", () => {
  it("deduplicates and sorts comment authors", () => {
    assert.deepEqual(
      buildMentionCandidates(["Sam", "Alex", "Sam", "  "], "Jordan"),
      ["Alex", "Jordan", "Sam"],
    )
  })
})

describe("getMentionContext", () => {
  it("returns context when @ is at start of token", () => {
    assert.deepEqual(getMentionContext("Hey @al", 7), {
      query: "al",
      startIndex: 4,
    })
  })

  it("returns null when @ is inside a word", () => {
    assert.equal(getMentionContext("email@test.com", 5), null)
  })
})

describe("filterMentionCandidates", () => {
  it("filters candidates by substring", () => {
    assert.deepEqual(
      filterMentionCandidates(["Alex", "Jordan", "Sam"], "jo"),
      ["Jordan"],
    )
  })
})

describe("insertMention", () => {
  it("replaces the active mention query with @Name", () => {
    assert.deepEqual(
      insertMention("Please review @al", 14, 17, "Alex"),
      {
        text: "Please review @Alex ",
        cursorIndex: 20,
      },
    )
  })
})

describe("parseCommentBodyWithMentions", () => {
  it("highlights known names and leaves unknown @ tokens as text", () => {
    assert.deepEqual(
      parseCommentBodyWithMentions(
        "Hey @Alex, cc @Jordan on @Unknown",
        ["Alex", "Jordan"],
      ),
      [
        { type: "text", value: "Hey " },
        { type: "mention", value: "Alex" },
        { type: "text", value: ", cc " },
        { type: "mention", value: "Jordan" },
        { type: "text", value: " on " },
        { type: "text", value: "@Unknown" },
      ],
    )
  })

  it("prefers the longest matching name", () => {
    assert.deepEqual(
      parseCommentBodyWithMentions("Ping @John Smith please", [
        "John",
        "John Smith",
      ]),
      [
        { type: "text", value: "Ping " },
        { type: "mention", value: "John Smith" },
        { type: "text", value: " please" },
      ],
    )
  })
})
