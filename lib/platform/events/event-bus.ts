type EventHandler<T = any> = (payload: T) => void | Promise<void>

class EventBus {
  private listeners = new Map<string, EventHandler[]>()

  on<T>(event: string, handler: EventHandler<T>): void {
    if (!this.listeners.has(event)) this.listeners.set(event, [])
    this.listeners.get(event)!.push(handler as EventHandler)
  }

  async emit<T>(event: string, payload: T): Promise<void> {
    await Promise.all((this.listeners.get(event) || []).map(h => h(payload)))
  }
}

export const eventBus = new EventBus()
