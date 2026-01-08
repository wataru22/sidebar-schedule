import { CalendarEvent, Calendar } from '../types'
import { CalendarService } from './CalendarService'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'

const execAsync = promisify(exec)

interface AppleCalendarEventRaw {
  id: string
  title: string
  startDate: string
  endDate: string
  isAllDay: boolean
  location?: string
  notes?: string
  calendarName: string
  calendarColor?: string
}

interface AppleCalendarRaw {
  id: string
  name: string
  color?: string
}

export class AppleCalendarService implements CalendarService {
  private binaryPath: string

  constructor(pluginDir: string) {
    console.log('[AppleCalendarService] pluginDir:', pluginDir)

    // Resolve the plugin directory path (handles symlinks)
    let resolvedPluginDir = pluginDir
    try {
      // Use realpathSync.native to resolve symlinks
      resolvedPluginDir = fs.realpathSync.native(pluginDir)
      console.log(
        '[AppleCalendarService] Resolved (native):',
        resolvedPluginDir
      )
    } catch (e1) {
      try {
        // Fallback to regular realpathSync
        resolvedPluginDir = fs.realpathSync(pluginDir)
        console.log(
          '[AppleCalendarService] Resolved (regular):',
          resolvedPluginDir
        )
      } catch (e2) {
        // If both fail, use the original path
        console.log(
          '[AppleCalendarService] Could not resolve, using original:',
          pluginDir,
          e2
        )
        resolvedPluginDir = pluginDir
      }
    }

    // Get current working directory (might be vault directory, not dev folder)
    const cwd = process.cwd()
    console.log('[AppleCalendarService] process.cwd():', cwd)

    // Try to find dev folder by going up from __dirname
    // __dirname in bundled code will be the plugin directory, but we can try to find the dev folder
    let devFolderPath: string | null = null
    try {
      // If we're in a symlinked plugin, resolvedPluginDir should point to the dev folder
      // Check if calendar-bridge exists in the resolved path
      const testPath = path.join(resolvedPluginDir, 'calendar-bridge')
      if (fs.existsSync(testPath)) {
        devFolderPath = resolvedPluginDir
      } else {
        // Try going up from resolvedPluginDir to find the dev folder
        let currentPath = resolvedPluginDir
        for (let i = 0; i < 5; i++) {
          const testBinary = path.join(currentPath, 'calendar-bridge')
          if (fs.existsSync(testBinary)) {
            devFolderPath = currentPath
            break
          }
          const parentPath = path.dirname(currentPath)
          if (parentPath === currentPath) break // Reached root
          currentPath = parentPath
        }
      }
    } catch (e) {
      console.log('[AppleCalendarService] Error finding dev folder:', e)
    }

    // Try multiple possible locations for the binary
    const possiblePaths = [
      path.join(resolvedPluginDir, 'calendar-bridge'),
      path.join(pluginDir, 'calendar-bridge'), // Original path in case realpath fails
      path.resolve(resolvedPluginDir, 'calendar-bridge'),
    ]

    // Add dev folder path if found
    if (devFolderPath) {
      possiblePaths.unshift(path.join(devFolderPath, 'calendar-bridge'))
      console.log('[AppleCalendarService] Dev folder found:', devFolderPath)
    }

    // Also try current working directory as last resort
    possiblePaths.push(path.resolve(cwd, 'calendar-bridge'))

    console.log(
      '[AppleCalendarService] Searching for binary in:',
      possiblePaths
    )

    // Find the first existing binary
    for (const possiblePath of possiblePaths) {
      try {
        const exists = fs.existsSync(possiblePath)
        console.log(
          `[AppleCalendarService] Checking: ${possiblePath} -> ${
            exists ? 'EXISTS' : 'NOT FOUND'
          }`
        )
        if (exists) {
          this.binaryPath = possiblePath
          console.log(
            '[AppleCalendarService] ✓ Found calendar-bridge at:',
            this.binaryPath
          )
          return
        }
      } catch (e) {
        console.log(`[AppleCalendarService] Error checking ${possiblePath}:`, e)
      }
    }

    // Fallback to the expected location
    this.binaryPath = path.join(resolvedPluginDir, 'calendar-bridge')
    console.warn(
      '[AppleCalendarService] ⚠ Calendar bridge binary not found, using fallback path:',
      this.binaryPath
    )
  }

  async isAvailable(): Promise<boolean> {
    // Check if we're on macOS
    if (process.platform !== 'darwin') {
      return false
    }

    // Check if the binary exists
    try {
      await fs.promises.access(this.binaryPath, fs.constants.X_OK)
      return true
    } catch {
      console.warn(
        'Apple Calendar bridge binary not found at:',
        this.binaryPath
      )
      return false
    }
  }

  async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    try {
      const startISO = startDate.toISOString()
      const endISO = endDate.toISOString()

      const { stdout } = await execAsync(
        `"${this.binaryPath}" events --start "${startISO}" --end "${endISO}"`,
        { timeout: 30000 }
      )

      const rawEvents: AppleCalendarEventRaw[] = JSON.parse(stdout)

      return rawEvents.map((raw) => ({
        id: raw.id,
        title: raw.title,
        startDate: new Date(raw.startDate),
        endDate: new Date(raw.endDate),
        isAllDay: raw.isAllDay,
        location: raw.location,
        notes: raw.notes,
        calendarName: raw.calendarName,
        calendarColor: raw.calendarColor,
        source: 'apple' as const,
      }))
    } catch (error) {
      console.error('Error fetching Apple Calendar events:', error)
      throw error
    }
  }

  async checkAuthorizationStatus(): Promise<
    'granted' | 'denied' | 'notDetermined' | 'restricted' | 'unknown'
  > {
    try {
      const { stdout } = await execAsync(`"${this.binaryPath}" check-auth`, {
        timeout: 5000,
      })
      const result = JSON.parse(stdout)
      return result.status || 'unknown'
    } catch (error) {
      console.error('Error checking authorization status:', error)
      return 'unknown'
    }
  }

  async getCalendars(): Promise<Calendar[]> {
    try {
      // First check authorization status
      const authStatus = await this.checkAuthorizationStatus()
      if (authStatus === 'notDetermined') {
        // Try to trigger permission request by running calendars command
        // This will request access if not determined
      }

      const { stdout } = await execAsync(`"${this.binaryPath}" calendars`, {
        timeout: 10000,
      })

      const rawCalendars: AppleCalendarRaw[] = JSON.parse(stdout)

      return rawCalendars.map((raw) => ({
        id: raw.id,
        name: raw.name,
        color: raw.color,
        source: 'apple' as const,
      }))
    } catch (error) {
      console.error('Error fetching Apple Calendars:', error)
      throw error
    }
  }
}
