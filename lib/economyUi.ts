export interface InFlightLatch {
  tryAcquire: () => boolean;
  release: () => void;
  isActive: () => boolean;
}

export function createInFlightLatch(): InFlightLatch {
  let active = false;
  return {
    tryAcquire() {
      if (active) return false;
      active = true;
      return true;
    },
    release() {
      active = false;
    },
    isActive() {
      return active;
    },
  };
}

export function markEventOnce(seenEventIds: Set<string>, eventId: string): boolean {
  if (!eventId || seenEventIds.has(eventId)) return false;
  seenEventIds.add(eventId);
  return true;
}
