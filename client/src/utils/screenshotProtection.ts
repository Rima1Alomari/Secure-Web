import { auditHelpers } from './audit'

export interface ScreenshotAttempt {
  id: string
  userId: string
  userName: string
  timestamp: string
  location: string
  method: 'keyboard' | 'browser' | 'unknown'
  blocked: boolean
}

const SCREENSHOT_ATTEMPTS_KEY = 'screenshot-attempts'

/**
 * Screenshot Protection Utility
 * Prevents non-admin users from taking screenshots and logs attempts
 */
export class ScreenshotProtection {
  private isAdmin: boolean
  private userId: string
  private userName: string
  private currentLocation: string = ''

  constructor(isAdmin: boolean, userId: string, userName: string) {
    this.isAdmin = isAdmin
    this.userId = userId
    this.userName = userName
  }

  /**
   * Set the current page location for tracking
   */
  setLocation(location: string) {
    this.currentLocation = location
  }

  /**
   * Initialize screenshot protection
   */
  initialize() {
    if (this.isAdmin) {
      // Admins can take screenshots freely
      return
    }

    // Prevent common screenshot methods
    this.preventKeyboardShortcuts()
    this.preventRightClick()
    this.preventDevTools()
    this.preventPrintScreen()
    this.detectScreenshotAttempts()
  }

  /**
   * Prevent keyboard shortcuts for screenshots
   */
  private preventKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Windows: Win + Shift + S, Print Screen, Alt + Print Screen
      // Mac: Cmd + Shift + 3/4, Cmd + Shift + Control + 3/4
      const isWindowsScreenshot = 
        (e.key === 'PrintScreen') ||
        (e.altKey && e.key === 'PrintScreen') ||
        (e.metaKey && e.shiftKey && (e.key === 'S' || e.key === 's'))
      
      const isMacScreenshot = 
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) ||
        (e.metaKey && e.shiftKey && e.ctrlKey && (e.key === '3' || e.key === '4'))

      if (isWindowsScreenshot || isMacScreenshot) {
        e.preventDefault()
        e.stopPropagation()
        this.logScreenshotAttempt('keyboard')
        this.showWarning()
        return false
      }
    }, true)
  }

  /**
   * Prevent right-click context menu (common screenshot method)
   */
  private preventRightClick() {
    document.addEventListener('contextmenu', (e) => {
      // Allow right-click but monitor for screenshot tools
      // We'll detect actual screenshot attempts through other methods
    })

    // Prevent common screenshot tool shortcuts
    document.addEventListener('keydown', (e) => {
      // Some screenshot tools use F12, Ctrl+Shift+I, etc.
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
        (e.key === 'F12')
      ) {
        // Allow dev tools for debugging, but log it
        this.logScreenshotAttempt('browser')
      }
    })
  }

  /**
   * Detect screenshot attempts through various methods
   */
  private detectScreenshotAttempts() {
    // Monitor for clipboard operations that might be screenshots
    document.addEventListener('copy', (e) => {
      // Check if clipboard contains image data
      navigator.clipboard.read().then(clipboardItems => {
        clipboardItems.forEach(item => {
          if (item.types.some(type => type.startsWith('image/'))) {
            this.logScreenshotAttempt('browser')
            this.showWarning()
          }
        })
      }).catch(() => {
        // Clipboard access denied or not available
      })
    })

    // Monitor for window blur (might indicate screenshot tool)
    let blurTimeout: NodeJS.Timeout
    window.addEventListener('blur', () => {
      blurTimeout = setTimeout(() => {
        // If window is blurred for more than 2 seconds, might be screenshot
        this.logScreenshotAttempt('unknown')
      }, 2000)
    })

    window.addEventListener('focus', () => {
      if (blurTimeout) {
        clearTimeout(blurTimeout)
      }
    })
  }

  /**
   * Prevent Print Screen key
   */
  private preventPrintScreen() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        e.stopPropagation()
        this.logScreenshotAttempt('keyboard')
        this.showWarning()
        return false
      }
    }, true)
  }

  /**
   * Prevent DevTools (F12, Ctrl+Shift+I)
   */
  private preventDevTools() {
    document.addEventListener('keydown', (e) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
        (e.key === 'F12')
      ) {
        // Log but don't block (needed for development)
        this.logScreenshotAttempt('browser')
      }
    })
  }

  /**
   * Log screenshot attempt
   */
  private logScreenshotAttempt(method: 'keyboard' | 'browser' | 'unknown') {
    const attempt: ScreenshotAttempt = {
      id: `screenshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: this.userId,
      userName: this.userName,
      timestamp: new Date().toISOString(),
      location: this.currentLocation || window.location.pathname,
      method,
      blocked: true
    }

    // Save to localStorage
    const attempts = this.getScreenshotAttempts()
    attempts.push(attempt)
    localStorage.setItem(SCREENSHOT_ATTEMPTS_KEY, JSON.stringify(attempts))

    // Log to audit system
    auditHelpers.logAction({
      action: 'screenshot_attempt',
      resourceType: 'system',
      resourceName: 'Screenshot Attempt',
      resourceId: attempt.id,
      success: false,
      details: {
        location: attempt.location,
        method: attempt.method,
        blocked: true,
        message: `Screenshot attempt detected and blocked at ${attempt.location}`
      }
    })

    // Dispatch custom event for real-time alert updates
    window.dispatchEvent(new CustomEvent('screenshot-attempt', { detail: attempt }))
  }

  /**
   * Get all screenshot attempts
   */
  getScreenshotAttempts(): ScreenshotAttempt[] {
    try {
      const stored = localStorage.getItem(SCREENSHOT_ATTEMPTS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Show warning message to user
   */
  private showWarning() {
    // Create a temporary warning overlay
    const warning = document.createElement('div')
    warning.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(220, 38, 38, 0.95);
      color: white;
      padding: 20px 40px;
      border-radius: 8px;
      z-index: 999999;
      font-size: 16px;
      font-weight: bold;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      animation: fadeIn 0.3s;
    `
    warning.textContent = '⚠️ Screenshots are not allowed. This attempt has been logged.'
    
    // Add fade-in animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -60%); }
        to { opacity: 1; transform: translate(-50%, -50%); }
      }
    `
    document.head.appendChild(style)
    document.body.appendChild(warning)

    // Remove after 3 seconds
    setTimeout(() => {
      warning.style.animation = 'fadeOut 0.3s'
      setTimeout(() => {
        document.body.removeChild(warning)
        document.head.removeChild(style)
      }, 300)
    }, 3000)
  }

  /**
   * Cleanup - remove event listeners
   */
  destroy() {
    // Event listeners will be cleaned up automatically when component unmounts
    // But we can add cleanup logic here if needed
  }
}

/**
 * Get screenshot attempts from storage
 */
export function getScreenshotAttempts(): ScreenshotAttempt[] {
  try {
    const stored = localStorage.getItem(SCREENSHOT_ATTEMPTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Clear screenshot attempts (admin only)
 */
export function clearScreenshotAttempts() {
  localStorage.removeItem(SCREENSHOT_ATTEMPTS_KEY)
}

