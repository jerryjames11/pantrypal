// PostHog analytics helper
// All tracking calls are fire-and-forget — never block the UI

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = 'https://app.posthog.com'

export function track(event, properties = {}) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return
  if (window.posthog) {
    window.posthog.capture(event, properties)
  }
}

export function identify(userId, properties = {}) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return
  if (window.posthog) {
    window.posthog.identify(userId, properties)
  }
}

export function reset() {
  if (typeof window === 'undefined') return
  if (window.posthog) window.posthog.reset()
}
