// Drives the swarm loop on an interval. Controllable (start/stop/tick) via the API.
// Honours the kill-switch: when engaged, ticks schedule nothing.

export class SwarmRunner {
  constructor(orchestrator, { intervalMs = 900 } = {}) {
    this.orchestrator = orchestrator
    this.intervalMs = intervalMs
    this.timer = null
  }

  get running() {
    return this.timer !== null
  }

  start() {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.orchestrator.tick().catch(() => {})
    }, this.intervalMs)
    if (this.timer.unref) this.timer.unref()
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
