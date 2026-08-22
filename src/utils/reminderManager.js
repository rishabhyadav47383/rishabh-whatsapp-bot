import cron from 'node-cron';

class ReminderManager {
  constructor() {
    this.reminders = [];
  }

  /**
   * Schedule a reminder after duration string (e.g. 10m, 1h, 30s)
   */
  schedule(sock, jid, durationStr, taskText) {
    const durationMs = this.parseDuration(durationStr);
    if (!durationMs) return false;

    const fireDate = new Date(Date.now() + durationMs);

    setTimeout(async () => {
      try {
        await sock.sendMessage(jid, {
          text: `⏰ *REMINDER ALERT!*\n\n📝 *Task:* ${taskText}\n📅 Set for: ${fireDate.toLocaleTimeString()}`,
        });
      } catch (e) {
        console.error('Failed to fire reminder:', e);
      }
    }, durationMs);

    return fireDate;
  }

  parseDuration(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;

    const num = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 's': return num * 1000;
      case 'm': return num * 60 * 1000;
      case 'h': return num * 60 * 60 * 1000;
      case 'd': return num * 24 * 60 * 60 * 1000;
      default: return null;
    }
  }
}

export const reminderManager = new ReminderManager();
