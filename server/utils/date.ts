/**
 * Date utility functions for handling Brazil timezone (America/Sao_Paulo)
 */

/**
 * Get today's date in Brazil timezone (America/Sao_Paulo)
 * Returns a string in YYYY-MM-DD format
 * 
 * This is important because toISOString() returns UTC date,
 * which can be a day ahead when it's late evening in Brazil (UTC-3)
 */
export function getTodayBrazilDate(): string {
  const now = new Date();
  // Use Intl.DateTimeFormat to get the date in Brazil timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA format returns YYYY-MM-DD
  return formatter.format(now);
}

/**
 * Check if an event date is in the past based on Brazil timezone
 * @param eventDate - Date string in YYYY-MM-DD format
 * @returns true if the event date is before today in Brazil timezone
 */
export function isEventPast(eventDate: string): boolean {
  const today = getTodayBrazilDate();
  return eventDate < today;
}

/**
 * Check if an event date is today or in the future based on Brazil timezone
 * @param eventDate - Date string in YYYY-MM-DD format
 * @returns true if the event date is today or after in Brazil timezone
 */
export function isEventUpcoming(eventDate: string): boolean {
  const today = getTodayBrazilDate();
  return eventDate >= today;
}

/**
 * Create a Date object for a specific date/time in Brazil timezone (America/Sao_Paulo)
 * This ensures dates are stored correctly regardless of server timezone
 * 
 * @param year - Full year (e.g., 2025)
 * @param month - Month (1-12, NOT 0-indexed)
 * @param day - Day of month (1-31)
 * @param hour - Hour (0-23), defaults to 0
 * @param minute - Minute (0-59), defaults to 0
 * @param second - Second (0-59), defaults to 0
 * @returns Date object representing the specified time in Brazil timezone
 */
export function createBrazilDate(
  year: number, 
  month: number, 
  day: number, 
  hour: number = 0, 
  minute: number = 0, 
  second: number = 0
): Date {
  // Format: YYYY-MM-DDTHH:mm:ss-03:00 for São Paulo (standard time)
  // Note: Brazil doesn't observe DST since 2019, so -03:00 is always correct
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}-03:00`;
  return new Date(dateStr);
}

/**
 * Get today's date parts in Brazil timezone
 * @returns Object with year, month, day as numbers
 */
export function getTodayBrazilParts(): { year: number; month: number; day: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  return { year, month, day };
}

/**
 * Get the current day number for an event based on Brazil timezone
 * Day 1 = startDate, Day 2 = startDate + 1 day, etc.
 * 
 * @param startDate - Event start date
 * @returns Current day number (1-based), or 0 if event hasn't started, or -1 if event ended
 */
export function getEventCurrentDay(startDate: Date, endDate: Date): number {
  const todayParts = getTodayBrazilParts();
  const todayBrazil = createBrazilDate(todayParts.year, todayParts.month, todayParts.day);
  
  // Get start and end dates at midnight Brazil time
  const startParts = getDatePartsFromDate(startDate);
  const startBrazil = createBrazilDate(startParts.year, startParts.month, startParts.day);
  
  const endParts = getDatePartsFromDate(endDate);
  const endBrazil = createBrazilDate(endParts.year, endParts.month, endParts.day);
  
  if (todayBrazil < startBrazil) return 0; // Event hasn't started
  if (todayBrazil > endBrazil) return -1; // Event ended
  
  // Calculate day number (1-based)
  const diffMs = todayBrazil.getTime() - startBrazil.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/**
 * Extract date parts from a Date object in Brazil timezone
 */
export function getDatePartsFromDate(date: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  return { year, month, day };
}

/**
 * Calculate total days of an event (inclusive of start and end dates)
 * Uses Brazil timezone for correct calendar day calculation
 * 
 * @param startDate - Event start date
 * @param endDate - Event end date
 * @returns Total number of days (1 if same day, 2 if consecutive days, etc.)
 */
export function getEventTotalDays(startDate: Date, endDate: Date): number {
  const startParts = getDatePartsFromDate(startDate);
  const startBrazil = createBrazilDate(startParts.year, startParts.month, startParts.day);
  
  const endParts = getDatePartsFromDate(endDate);
  const endBrazil = createBrazilDate(endParts.year, endParts.month, endParts.day);
  
  const diffMs = endBrazil.getTime() - startBrazil.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays + 1; // +1 because both start and end days are inclusive
}
