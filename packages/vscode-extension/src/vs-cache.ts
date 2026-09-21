import * as vscode from "vscode"
import { CacheStore } from "@codefunc/core/src"

export class WorkspaceStateCache implements CacheStore {
  private readonly MAX_ITEMS = 500

  constructor(private state: vscode.Memento) {}

  get<T>(key: string): T | undefined {
    return this.state.get<T>(`codefunc:cache:${key}`)
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.state.update(`codefunc:cache:${key}`, value)
    this.cleanup()
  }

  private async cleanup() {
    const keys = this.state
      .keys()
      .filter((k) => k.startsWith("codefunc:cache:"))
    if (keys.length > this.MAX_ITEMS) {
      const items = keys.map((k) => ({
        key: k,
        val: this.state.get<any>(k),
      }))
      // Sort by timestamp (oldest first)
      items.sort((a, b) => (a.val?.timestamp || 0) - (b.val?.timestamp || 0))
      const toDeleteCount = items.length - this.MAX_ITEMS
      for (let i = 0; i < toDeleteCount; i++) {
        await this.state.update(items[i].key, undefined)
      }
    }
  }

  async delete(key: string): Promise<void> {
    await this.state.update(`codefunc:cache:${key}`, undefined)
  }

  async clear(): Promise<void> {
    const keys = this.state
      .keys()
      .filter((k) => k.startsWith("codefunc:cache:"))
    for (const key of keys) {
      await this.state.update(key, undefined)
    }
  }
}
