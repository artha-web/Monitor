/**
 * Scheduling & Active Time Window utilities
 * Handles custom intervals (e.g. 14m, 1h, 30s) and active time windows (e.g. 07:00 to 12:00)
 */

export interface ActiveWindowOptions {
  activeWindowStart?: string | null;
  activeWindowEnd?: string | null;
  timezone?: string | null;
}

export interface NextCheckOptions extends ActiveWindowOptions {
  interval: string;
  fromDate?: Date;
}

/**
 * Converts any interval string ('1m', '14m', '30s', '2h', etc.) to milliseconds.
 */
export function intervalToMs(interval: string): number {
  if (!interval) return 60_000;
  const match = interval.trim().match(/^(\d+)([smhd]?)$/i);
  if (!match || !match[1]) return 60_000;
  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'm').toLowerCase();
  switch (unit) {
    case 's': return value * 1_000;
    case 'm': return value * 60_000;
    case 'h': return value * 3_600_000;
    case 'd': return value * 86_400_000;
    default: return value * 60_000;
  }
}

/**
 * Converts milliseconds to an interval string.
 */
export function msToInterval(ms: number): string {
  if (ms >= 86_400_000 && ms % 86_400_000 === 0) return `${ms / 86_400_000}d`;
  if (ms >= 3_600_000 && ms % 3_600_000 === 0) return `${ms / 3_600_000}h`;
  if (ms >= 60_000 && ms % 60_000 === 0) return `${ms / 60_000}m`;
  if (ms >= 1_000 && ms % 1_000 === 0) return `${ms / 1_000}s`;
  return `${Math.round(ms / 60_000)}m`;
}

/**
 * Formats an interval into human-readable text.
 */
export function formatInterval(interval: string): string {
  const match = interval.trim().match(/^(\d+)([smhd]?)$/i);
  if (!match || !match[1]) return interval;
  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'm').toLowerCase();
  switch (unit) {
    case 's': return value === 1 ? '1 second' : `${value} seconds`;
    case 'm': return value === 1 ? '1 minute' : `${value} minutes`;
    case 'h': return value === 1 ? '1 hour' : `${value} hours`;
    case 'd': return value === 1 ? '1 day' : `${value} days`;
    default: return `${value} minutes`;
  }
}

/**
 * Extracts date parts in a given IANA timezone.
 */
function getPartsInTz(date: Date, tz: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const m: Record<string, string> = {};
    for (const p of parts) m[p.type] = p.value;
    return {
      year: parseInt(m['year'] || '1970', 10),
      month: parseInt(m['month'] || '1', 10),
      day: parseInt(m['day'] || '1', 10),
      hour: parseInt(m['hour'] === '24' ? '0' : m['hour'] || '0', 10),
      minute: parseInt(m['minute'] || '0', 10),
    };
  } catch {
    // Fallback to UTC if timezone is invalid
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
    };
  }
}

/**
 * Constructs a Date object in the target timezone for a given Y-M-D and H:m.
 */
function constructDateInTz(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string
): Date {
  try {
    const approxUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
    const parts = getPartsInTz(approxUtc, tz);
    const tzAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
    const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    const offsetDiff = tzAsUtc - desiredAsUtc;
    return new Date(approxUtc.getTime() - offsetDiff);
  } catch {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  }
}

/**
 * Checks if a given timestamp falls within the active time window.
 * Returns true if no window is defined (always active).
 */
export function isWithinActiveWindow(options: ActiveWindowOptions & { date?: Date }): boolean {
  const { activeWindowStart, activeWindowEnd, timezone, date = new Date() } = options;
  if (!activeWindowStart || !activeWindowEnd) return true;

  const tz = timezone || 'UTC';
  const parts = getPartsInTz(date, tz);
  const curMinutes = parts.hour * 60 + parts.minute;

  const [startH = 0, startM = 0] = activeWindowStart.split(':').map(Number);
  const [endH = 0, endM = 0] = activeWindowEnd.split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  if (startMin <= endMin) {
    // Normal window: e.g. 07:00 (420) to 12:00 (720)
    return curMinutes >= startMin && curMinutes <= endMin;
  } else {
    // Overnight window: e.g. 22:00 to 06:00
    return curMinutes >= startMin || curMinutes <= endMin;
  }
}

/**
 * Calculates the next check timestamp honoring both interval and active time window.
 */
export function calculateNextCheckAt(options: NextCheckOptions): Date {
  const {
    interval,
    activeWindowStart,
    activeWindowEnd,
    timezone,
    fromDate = new Date(),
  } = options;

  const intervalMs = intervalToMs(interval);
  const candidate = new Date(fromDate.getTime() + intervalMs);

  if (!activeWindowStart || !activeWindowEnd) {
    return candidate;
  }

  const tz = timezone || 'UTC';
  if (isWithinActiveWindow({ activeWindowStart, activeWindowEnd, timezone: tz, date: candidate })) {
    return candidate;
  }

  // Outside active window: calculate when the next window opens
  const parts = getPartsInTz(candidate, tz);
  const curMinutes = parts.hour * 60 + parts.minute;

  const [startH = 0, startM = 0] = activeWindowStart.split(':').map(Number);
  const [endH = 0, endM = 0] = activeWindowEnd.split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  let daysToAdd = 0;
  if (startMin <= endMin) {
    if (curMinutes > endMin) {
      // Past today's window; resumes at start tomorrow
      daysToAdd = 1;
    } else {
      // Before today's window; resumes at start today
      daysToAdd = 0;
    }
  } else {
    // Overnight window
    daysToAdd = 0;
  }

  return constructDateInTz(parts.year, parts.month, parts.day + daysToAdd, startH, startM, tz);
}
