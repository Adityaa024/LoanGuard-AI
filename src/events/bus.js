// Tiny event bus → fan-out to SSE clients. The hive visualization subscribes to this.
// Domain-agnostic: it just relays {type, payload} envelopes with a monotonic id.

export class EventBus {
  #clients = new Set()
  #seq = 0
  #recent = []
  #maxRecent = 200

  emit(type, payload) {
    this.#seq += 1
    const evt = { id: this.#seq, type, payload, at: new Date().toISOString() }
    this.#recent.push(evt)
    if (this.#recent.length > this.#maxRecent) this.#recent.shift()
    for (const send of this.#clients) {
      try {
        send(evt)
      } catch {
        /* a dead client; subscription cleanup happens on its 'close' */
      }
    }
    return evt
  }

  subscribe(send) {
    this.#clients.add(send)
    return () => this.#clients.delete(send)
  }

  recent(limit = 50) {
    return this.#recent.slice(-limit)
  }

  clientCount() {
    return this.#clients.size
  }
}
