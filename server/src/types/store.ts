import type { Comment } from "./comment.js"
import type { Deliverable } from "./deliverable.js"
import type { Milestone } from "./milestone.js"
import type { Project } from "./project.js"
import type { Version } from "./version.js"

export interface DataStore {
  projects: Project[]
  deliverables: Deliverable[]
  milestones: Milestone[]
  versions: Version[]
  comments: Comment[]
}

export const EMPTY_STORE: DataStore = {
  projects: [],
  deliverables: [],
  milestones: [],
  versions: [],
  comments: [],
}
