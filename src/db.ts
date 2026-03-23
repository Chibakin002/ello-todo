import Dexie, { type Table } from 'dexie'
import type { FocusSession, Task } from './types'

export class MomentumDB extends Dexie {
  tasks!: Table<Task, string>
  sessions!: Table<FocusSession, string>

  constructor() {
    super('MomentumTodoDB')
    this.version(1).stores({
      tasks: 'id, status, lane, updatedAt, createdAt',
      sessions: 'id, taskId, completed, endedAt',
    })
  }
}

export const db = new MomentumDB()
