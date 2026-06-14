import '../styles/globals.css'
import Head from 'next/head'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    // Load PostHog
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      import('posthog-js').then(({ default: posthog }) => {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host: 'https://us.i.posthog.com',
          capture_pageview: false, // manual
          autocapture: false,
        })
        window.posthog = posthog
        posthog.capture('$pageview')
      })
    }

    // Track page changes
    const handleRouteChange = () => {
      if (window.posthog) window.posthog.capture('$pageview')
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [])

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Paytone+One&display=swap" rel="stylesheet" />
        <title>PantryPal</title>
      </Head>
      <Component {...pageProps} />
    </>
  )
}
