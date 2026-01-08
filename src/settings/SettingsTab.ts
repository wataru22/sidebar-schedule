import { App, PluginSettingTab, Setting, Notice } from 'obsidian'
import type SchedulePlugin from '../main'
import { Calendar } from '../types'

export class ScheduleSettingsTab extends PluginSettingTab {
  plugin: SchedulePlugin
  private appleCalendars: Calendar[] = []

  constructor(app: App, plugin: SchedulePlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  async display(): Promise<void> {
    const { containerEl } = this
    containerEl.empty()

    containerEl.createEl('h2', { text: 'Schedule Settings' })

    // === Display Settings ===
    containerEl.createEl('h3', { text: 'Display' })

    new Setting(containerEl)
      .setName('Days to show')
      .setDesc('Number of days to display in the schedule')
      .addSlider((slider) =>
        slider
          .setLimits(1, 30, 1)
          .setValue(this.plugin.settings.daysToShow)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.daysToShow = value
            await this.plugin.saveSettings()
          })
      )

    new Setting(containerEl)
      .setName('Time format')
      .setDesc('12-hour or 24-hour time format')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('12h', '12-hour (1:00 PM)')
          .addOption('24h', '24-hour (13:00)')
          .setValue(this.plugin.settings.timeFormat)
          .onChange(async (value: '12h' | '24h') => {
            this.plugin.settings.timeFormat = value
            await this.plugin.saveSettings()
          })
      )

    new Setting(containerEl)
      .setName('Show all-day events')
      .setDesc('Display all-day events in the schedule')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showAllDayEvents)
          .onChange(async (value) => {
            this.plugin.settings.showAllDayEvents = value
            await this.plugin.saveSettings()
          })
      )

    new Setting(containerEl)
      .setName('Show calendar colors')
      .setDesc('Display color indicators for each calendar')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showCalendarColors)
          .onChange(async (value) => {
            this.plugin.settings.showCalendarColors = value
            await this.plugin.saveSettings()
          })
      )

    // === Apple Calendar Settings ===
    if (process.platform === 'darwin') {
      containerEl.createEl('h3', { text: 'Apple Calendar' })

      new Setting(containerEl)
        .setName('Enable Apple Calendar')
        .setDesc('Sync events from macOS Calendar app')
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.appleCalendarEnabled)
            .onChange(async (value) => {
              this.plugin.settings.appleCalendarEnabled = value
              await this.plugin.saveSettings()
              await this.plugin.initializeCalendarServices()
              // Small delay to allow permission prompt to appear
              await new Promise((resolve) => setTimeout(resolve, 100))
              this.display() // Refresh to show/hide calendar selection
            })
        )

      if (this.plugin.settings.appleCalendarEnabled) {
        await this.renderAppleCalendarSelection(containerEl)
      }
    }

    // === Refresh Settings ===
    containerEl.createEl('h3', { text: 'Refresh' })

    new Setting(containerEl)
      .setName('Auto-refresh')
      .setDesc('Automatically refresh events periodically')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoRefreshEnabled)
          .onChange(async (value) => {
            this.plugin.settings.autoRefreshEnabled = value
            await this.plugin.saveSettings()
            this.plugin.updateAutoRefresh()
          })
      )

    new Setting(containerEl)
      .setName('Refresh interval')
      .setDesc('Minutes between automatic refreshes')
      .addSlider((slider) =>
        slider
          .setLimits(5, 60, 5)
          .setValue(this.plugin.settings.autoRefreshInterval)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.autoRefreshInterval = value
            await this.plugin.saveSettings()
            this.plugin.updateAutoRefresh()
          })
      )
  }

  private async renderAppleCalendarSelection(
    containerEl: HTMLElement
  ): Promise<void> {
    try {
      this.appleCalendars =
        await this.plugin.calendarManager.getAppleCalendars()

      if (this.appleCalendars.length === 0) {
        await this.showCalendarAccessPrompt(
          containerEl,
          'No calendars found',
          'Make sure the calendar bridge is installed and calendar access is granted'
        )
        return
      }

      const calendarContainer = containerEl.createDiv({
        cls: 'schedule-calendar-selection',
      })
      calendarContainer.createEl('div', {
        text: 'Select calendars to display:',
        cls: 'setting-item-name',
      })

      // Group calendars by account
      const calendarsByAccount = new Map<string, Calendar[]>()
      for (const calendar of this.appleCalendars) {
        const account = calendar.accountTitle || 'Other'
        if (!calendarsByAccount.has(account)) {
          calendarsByAccount.set(account, [])
        }
        calendarsByAccount.get(account)!.push(calendar)
      }

      // Sort accounts alphabetically
      const sortedAccounts = Array.from(calendarsByAccount.keys()).sort()

      // Render each account group
      for (const account of sortedAccounts) {
        const accountCalendars = calendarsByAccount.get(account)!

        // Account header
        const accountHeader = calendarContainer.createDiv({
          cls: 'schedule-account-header',
        })
        accountHeader.createEl('h4', {
          text: account,
          cls: 'schedule-account-title',
        })

        // Calendars for this account
        for (const calendar of accountCalendars) {
          new Setting(calendarContainer)
            .setName(calendar.name)
            .addToggle((toggle) =>
              toggle
                .setValue(
                  this.plugin.settings.selectedAppleCalendars.includes(
                    calendar.id
                  )
                )
                .onChange(async (value) => {
                  if (value) {
                    if (
                      !this.plugin.settings.selectedAppleCalendars.includes(
                        calendar.id
                      )
                    ) {
                      this.plugin.settings.selectedAppleCalendars.push(
                        calendar.id
                      )
                    }
                  } else {
                    const index =
                      this.plugin.settings.selectedAppleCalendars.indexOf(
                        calendar.id
                      )
                    if (index > -1) {
                      this.plugin.settings.selectedAppleCalendars.splice(
                        index,
                        1
                      )
                    }
                  }
                  await this.plugin.saveSettings()
                  this.plugin.updateCalendarSelection()
                })
            )
        }
      }
    } catch (error) {
      await this.showCalendarAccessPrompt(
        containerEl,
        'Error loading calendars',
        'Calendar access may be denied. Click the button below to request access.'
      )
    }
  }

  private async showCalendarAccessPrompt(
    containerEl: HTMLElement,
    title: string,
    description: string
  ): Promise<void> {
    const setting = new Setting(containerEl).setName(title).setDesc(description)

    // Check authorization status
    let authStatus = 'unknown'
    try {
      const appleService = (this.plugin.calendarManager as any).sources?.get(
        'apple'
      )
      if (
        appleService &&
        typeof appleService.checkAuthorizationStatus === 'function'
      ) {
        authStatus = await appleService.checkAuthorizationStatus()
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
    }

    // Add status info
    const statusEl = containerEl.createDiv({
      cls: 'schedule-auth-status',
    })
    let statusText = 'Unknown authorization status'
    if (authStatus === 'notDetermined') {
      statusText = 'Calendar access has not been requested yet'
    } else if (authStatus === 'denied') {
      statusText =
        'Calendar access was denied. Please enable it in System Settings.'
    } else if (authStatus === 'granted') {
      statusText = 'Calendar access is granted, but no calendars found'
    }
    statusEl.createEl('p', {
      text: `Status: ${statusText}`,
      cls: 'schedule-status-text',
    })

    // Add instructions
    const instructionsEl = containerEl.createDiv({
      cls: 'schedule-permission-instructions',
    })
    instructionsEl.createEl('p', {
      text: 'To grant calendar access:',
      cls: 'schedule-instruction-title',
    })
    const steps = instructionsEl.createEl('ol', {
      cls: 'schedule-instruction-steps',
    })

    if (authStatus === 'notDetermined') {
      steps.createEl('li', {
        text: 'Click the "Request Calendar Access" button below',
      })
      steps.createEl('li', {
        text: 'A macOS permission dialog should appear - click "OK" or "Allow"',
      })
      steps.createEl('li', {
        text: 'If no dialog appears, the permission request may be silent. Check System Settings > Privacy & Security > Calendars',
      })
    } else if (authStatus === 'denied') {
      steps.createEl('li', {
        text: 'Open System Settings > Privacy & Security > Calendars',
      })
      steps.createEl('li', {
        text: 'Find "Obsidian" in the list (it may appear as the calendar-bridge binary)',
      })
      steps.createEl('li', {
        text: 'Toggle the switch to enable calendar access',
      })
    } else {
      steps.createEl('li', {
        text: 'Open System Settings > Privacy & Security > Calendars',
      })
      steps.createEl('li', {
        text: 'Ensure Obsidian or calendar-bridge is enabled',
      })
    }

    steps.createEl('li', {
      text: 'Return here and click "Retry After Granting Access"',
    })

    setting.addButton((button) =>
      button
        .setButtonText('Request Calendar Access')
        .setCta()
        .onClick(async () => {
          try {
            // Try using 'open' command to run the binary, which might trigger the prompt better
            const { exec } = require('child_process')
            const { promisify } = require('util')
            const execAsync = promisify(exec)
            const appleService = (
              this.plugin.calendarManager as any
            ).sources?.get('apple')

            if (appleService) {
              // First try to trigger permission request
              try {
                await appleService.checkAuthorizationStatus()
              } catch (e) {
                // Ignore
              }

              // Then try to fetch calendars
              this.appleCalendars =
                await this.plugin.calendarManager.getAppleCalendars()

              if (this.appleCalendars.length > 0) {
                new Notice('Calendar access granted!')
                this.display()
              } else {
                await this.display()
                new Notice(
                  'No calendars found. Please check System Settings > Privacy & Security > Calendars.'
                )
              }
            }
          } catch (error) {
            await this.display()
            new Notice(
              'Permission request attempted. If no dialog appeared, please manually enable in System Settings.'
            )
          }
        })
    )

    setting.addButton((button) =>
      button.setButtonText('Open System Settings').onClick(async () => {
        try {
          // Open System Settings directly to Calendars section
          const { exec } = require('child_process')
          const { promisify } = require('util')
          const execAsync = promisify(exec)
          await execAsync(
            'open "x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars"'
          )
          new Notice('Opening System Settings to Calendars permissions...')
        } catch (error) {
          // Fallback: try older macOS method
          try {
            const { exec } = require('child_process')
            const { promisify } = require('util')
            const execAsync = promisify(exec)
            await execAsync(
              'open "x-apple.systempreferences:com.apple.preference.security?Privacy"'
            )
            new Notice(
              'Opening System Settings. Navigate to Privacy & Security > Calendars'
            )
          } catch (e) {
            new Notice(
              'Could not open System Settings. Please open it manually.'
            )
          }
        }
      })
    )

    setting.addButton((button) =>
      button.setButtonText('Retry After Granting Access').onClick(async () => {
        try {
          this.appleCalendars =
            await this.plugin.calendarManager.getAppleCalendars()

          if (this.appleCalendars.length > 0) {
            new Notice('Calendar access granted!')
            this.display()
          } else {
            new Notice(
              'Still no access. Make sure Obsidian is enabled in System Settings > Privacy & Security > Calendars.'
            )
          }
        } catch (error) {
          new Notice(
            'Access still denied. Please check System Settings > Privacy & Security > Calendars.'
          )
        }
      })
    )
  }
}
