export const SNAPSHOT_VERSION = 3;

export function isSnapshotForDay(value, day) {
  return value !== null
    && typeof value === 'object'
    && value.version === SNAPSHOT_VERSION
    && value.snapshot?.ok === true
    && value.snapshot.day === day
    && Number.isFinite(value.snapshot.updatedAt)
    && Array.isArray(value.snapshot.providers)
    && Array.isArray(value.snapshot.activity?.days);
}

export function snapshotWire(snapshot, now, refreshing = false, refreshError = null) {
  return {
    ...snapshot,
    cache: {
      ageMs: Math.max(0, now - snapshot.updatedAt),
      refreshing,
      ...(refreshError ? { refreshError } : {}),
    },
  };
}
