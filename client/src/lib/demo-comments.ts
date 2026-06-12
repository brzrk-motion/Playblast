import type { Comment } from "@/types/comment"

export const DEMO_COMMENTS: Comment[] = [
  {
    id: "c1",
    timestamp: 4.2,
    author: "Alex",
    body: "Logo reveal feels a bit fast — can we ease in over 0.5s?",
  },
  {
    id: "c2",
    timestamp: 12.8,
    author: "Jordan",
    body: "Love the camera move here. Maybe push the DOF slightly stronger.",
  },
  {
    id: "c3",
    timestamp: 28.5,
    author: "Sam",
    body: "Color grade is too warm in this section — match the reference still.",
  },
  {
    id: "c4",
    timestamp: 45.0,
    author: "Alex",
    body: "Text kerning on the lower third needs tightening.",
  },
  {
    id: "c5",
    timestamp: 67.3,
    author: "Morgan",
    body: "Audio dip at the transition — crossfade should be smoother.",
  },
]
