import { Plugin, WorkspaceLeaf } from 'obsidian'
import { ScheduleView, VIEW_TYPE_SCHEDULE } from './views/ScheduleView'
import { ScheduleSettingsTab } from './settings/SettingsTab'
import { CalendarManager } from './calendar/CalendarManager'
import { AppleCalendarService } from './calendar/AppleCalendarService'
import { SchedulePluginSettings, DEFAULT_SETTINGS } from './types'
import * as path from 'path'

export default class SchedulePlugin extends Plugin {
  settings: SchedulePluginSettings
  calendarManager: CalendarManager
  private refreshInterval: number | null = null

  async onload() {
    await this.loadSettings()

    this.calendarManager = new CalendarManager()

    // Initialize calendar services
    await this.initializeCalendarServices()

    // Register view
    this.registerView(
      VIEW_TYPE_SCHEDULE,
      (leaf) => new ScheduleView(leaf, this.calendarManager, this.settings)
    )

    // Add ribbon icon
    this.addRibbonIcon('calendar', 'Open Schedule', () => {
      this.activateView()
    })

    // Add command
    this.addCommand({
      id: 'open-schedule-view',
      name: 'Open Schedule',
      callback: () => {
        this.activateView()
      },
    })

    // Add command to refresh
    this.addCommand({
      id: 'refresh-schedule',
      name: 'Refresh Schedule',
      callback: () => {
        this.refreshAllViews()
      },
    })

    // Add settings tab
    this.addSettingTab(new ScheduleSettingsTab(this.app, this))

    // Start auto-refresh if enabled
    if (this.settings.autoRefreshEnabled) {
      this.startAutoRefresh()
    }
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_SCHEDULE)
    this.stopAutoRefresh()
  }

  async initializeCalendarServices(): Promise<void> {
    // Remove existing services
    this.calendarManager.removeSource('apple')

    // Initialize Apple Calendar (macOS only)
    if (process.platform === 'darwin' && this.settings.appleCalendarEnabled) {
      const pluginDir = this.manifest.dir
      if (pluginDir) {
        // Resolve plugin directory relative to vault if it's a relative path
        // @ts-ignore - basePath exists but may not be in types
        const vaultPath = (this.app.vault.adapter as any).basePath || ''
        const resolvedPluginDir = path.isAbsolute(pluginDir)
          ? pluginDir
          : vaultPath
          ? path.join(vaultPath, pluginDir)
          : pluginDir
        const appleService = new AppleCalendarService(resolvedPluginDir)
        this.calendarManager.addSource('apple', appleService)
        this.calendarManager.setSelectedCalendars(
          'apple',
          this.settings.selectedAppleCalendars
        )

        // Try to fetch calendars to trigger permission prompt
        try {
          await this.calendarManager.getAppleCalendars()
        } catch (error) {
          // Permission denied or other error - this is expected on first run
          console.log('Calendar access not yet granted:', error)
        }
      }
    }
  }

  updateCalendarSelection(): void {
    this.calendarManager.setSelectedCalendars(
      'apple',
      this.settings.selectedAppleCalendars
    )
    this.refreshAllViews()
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app

    let leaf: WorkspaceLeaf | null = null
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_SCHEDULE)

    if (leaves.length > 0) {
      leaf = leaves[0]
    } else {
      leaf = workspace.getRightLeaf(false)
      if (leaf) {
        await leaf.setViewState({ type: VIEW_TYPE_SCHEDULE, active: true })
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf)
    }
  }

  private async refreshAllViews(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SCHEDULE)
    for (const leaf of leaves) {
      const view = leaf.view as ScheduleView
      view.updateSettings(this.settings)
      await view.refresh()
    }
  }

  updateAutoRefresh(): void {
    this.stopAutoRefresh()
    if (this.settings.autoRefreshEnabled) {
      this.startAutoRefresh()
    }
  }

  private startAutoRefresh(): void {
    const intervalMs = this.settings.autoRefreshInterval * 60 * 1000
    this.refreshInterval = window.setInterval(() => {
      this.refreshAllViews()
    }, intervalMs)
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval !== null) {
      window.clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings)
  }
}
