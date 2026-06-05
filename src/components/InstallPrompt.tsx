import { useEffect, useState } from 'react'

// The beforeinstallprompt event isn't in the standard lib typings.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'weather:install-dismissed'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from the home screen
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/**
 * A dismissible "Add to Home Screen" banner. On Chromium it wires up the native
 * install prompt; on iOS Safari (no install API) it shows manual instructions.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (dismissed || isStandalone()) return

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // iOS never fires beforeinstallprompt, so offer manual guidance there.
    if (isIos()) setShowIosHint(true)

    // Hide everything once the app gets installed.
    function onInstalled() {
      setDeferred(null)
      setShowIosHint(false)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [dismissed])

  function dismiss() {
    setDismissed(true)
    setDeferred(null)
    setShowIosHint(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    dismiss()
  }

  if (dismissed) return null
  if (!deferred && !showIosHint) return null

  return (
    <div className="install-banner" role="dialog" aria-label="Install this app">
      <span className="install-icon" aria-hidden="true">
        📲
      </span>
      <div className="install-text">
        <strong>Install Weather</strong>
        {deferred ? (
          <span>Add it to your home screen for one-tap, full-screen access.</span>
        ) : (
          <span>
            Tap the Share button <span aria-hidden="true">⎙</span>, then “Add to Home Screen”.
          </span>
        )}
      </div>
      {deferred && (
        <button className="install-btn" onClick={install}>
          Install
        </button>
      )}
      <button className="install-close" onClick={dismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}
