import type { Comment } from "./comment.js"
import type { Project } from "./project.js"
import type { Version } from "./version.js"

export interface DataStore {
  projects: Project[]
  versions: Version[]
  comments: Comment[]
}

export const EMPTY_STORE: DataStore = {
  projects: [],
  versions: [],
  comments: [],
}
