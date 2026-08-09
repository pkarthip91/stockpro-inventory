// A minimal pub/sub built on a native browser CustomEvent — no library needed.
// Any component that creates/updates data calls notifyActivity() once it succeeds.
// The Header's notification bell listens for this event and refetches only then,
// instead of polling on a fixed interval regardless of whether anything changed.

const EVENT_NAME = "stockpro:activity";

export function notifyActivity() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

export function onActivity(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}
