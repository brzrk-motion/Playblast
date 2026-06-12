import type { Comment } from "@/types/comment"

const DEMO_VERSION_ID = "demo-version"

export const DEMO_COMMENTS: Comment[] = [
  {
    id: "c1",
    versionId: DEMO_VERSION_ID,
    timestamp: 4.2,
    author: "Alex",
    body: "Logo reveal feels a bit fast — can we ease in over 0.5s?",
    createdAt: "2026-06-01T10:00:00.000Z",
    resolved: false,
  },
  {
    id: "c2",
    versionId: DEMO_VERSION_ID,
    timestamp: 12.8,
    author: "Jordan",
    body: "Love the camera move here. Maybe push the DOF slightly stronger.",
    createdAt: "2026-06-01T10:05:00.000Z",
    resolved: false,
  },
  {
    id: "c3",
    versionId: DEMO_VERSION_ID,
    timestamp: 28.5,
    author: "Sam",
    body: "Color grade is too warm in this section — match the reference still.",
    createdAt: "2026-06-01T10:12:00.000Z",
    resolved: true,
  },
  {
    id: "c4",
    versionId: DEMO_VERSION_ID,
    timestamp: 45.0,
    author: "Alex",
    body: "Text kerning on the lower third needs tightening.",
    createdAt: "2026-06-01T10:20:00.000Z",
    resolved: false,
  },
  {
    id: "c5",
    versionId: DEMO_VERSION_ID,
    timestamp: 67.3,
    author: "Morgan",
    body: "Audio dip at the transition — crossfade should be smoother.",
    createdAt: "2026-06-01T10:30:00.000Z",
    resolved: false,
  },
]
