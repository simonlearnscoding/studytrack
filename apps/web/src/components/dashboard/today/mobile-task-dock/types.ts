import type { Task } from '../data'

// The placeholder `Task` is keyed by title in the list, which collides the
// moment two tasks share a name. The dock holds its own copy in state, so it
// carries a stable id alongside the mock shape.
export type DockTask = Task & { id: string }
