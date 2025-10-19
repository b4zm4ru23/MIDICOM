/**
 * Logger utility for MIDICOM
 * Provides development-only logging that is automatically disabled in production
 */

/**
 * Development-only console.log wrapper
 * Logs are only displayed when running in development mode (import.meta.env.DEV)
 * Automatically disabled in production builds
 */
export const devLog = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args)
  }
}

/**
 * Development-only console.warn wrapper
 * Warnings are only displayed in development mode
 */
export const devWarn = (...args) => {
  if (import.meta.env.DEV) {
    console.warn(...args)
  }
}

/**
 * Development-only console.error wrapper
 * Note: Errors are always logged regardless of environment for debugging
 */
export const devError = (...args) => {
  console.error(...args)
}

/**
 * Always log (production + development)
 * Use sparingly for critical information
 */
export const prodLog = (...args) => {
  console.log(...args)
}


