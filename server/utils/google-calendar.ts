// Google Calendar Integration - Sync events to user's Google Calendar
// Uses Replit's Google Calendar connector

import { google } from 'googleapis';
import type { SiteEvent } from '@shared/schema';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings?.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings) {
    throw new Error('Google Calendar not connected');
  }

  const accessToken = connectionSettings?.settings?.access_token || 
                      connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error('Google Calendar access token not found');
  }
  return accessToken;
}

async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

function calculateEndTime(startDate: string, startTime: string, durationHours: number = 2): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const start = new Date(`${startDate}T${startTime}:00`);
  start.setHours(start.getHours() + durationHours);
  return `${start.getHours().toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function getEndDateAfterDuration(startDate: string, startTime: string, durationHours: number = 2): string {
  const start = new Date(`${startDate}T${startTime}:00`);
  start.setHours(start.getHours() + durationHours);
  return start.toISOString().split('T')[0];
}

export async function syncEventToGoogleCalendar(event: SiteEvent): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    
    const startDateTime = event.time 
      ? `${event.startDate}T${event.time}:00`
      : event.startDate;
    
    const endDate = event.endDate || (event.time ? getEndDateAfterDuration(event.startDate, event.time) : event.startDate);
    const endDateTime = event.time
      ? `${endDate}T${calculateEndTime(event.startDate, event.time)}:00`
      : endDate;

    const calendarEvent = {
      summary: event.title,
      description: event.description || event.shortDescription || '',
      location: event.location || undefined,
      start: event.time ? {
        dateTime: startDateTime,
        timeZone: 'America/Sao_Paulo',
      } : {
        date: event.startDate,
      },
      end: event.time ? {
        dateTime: endDateTime,
        timeZone: 'America/Sao_Paulo',
      } : {
        date: endDate,
      },
      source: {
        title: 'UMP Emaus',
        url: event.locationUrl || 'https://umpemaus.com.br',
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: calendarEvent,
    });

    return { success: true, eventId: response.data.id || undefined };
  } catch (error) {
    console.error('Error syncing event to Google Calendar:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao sincronizar evento' 
    };
  }
}

export async function syncAllEventsToGoogleCalendar(events: SiteEvent[]): Promise<{ 
  success: boolean; 
  synced: number; 
  failed: number; 
  errors: string[] 
}> {
  const results = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const event of events) {
    if (!event.isPublished) continue;
    
    const result = await syncEventToGoogleCalendar(event);
    if (result.success) {
      results.synced++;
    } else {
      results.failed++;
      if (result.error) {
        results.errors.push(`${event.title}: ${result.error}`);
      }
    }
  }

  results.success = results.failed === 0;
  return results;
}

export function generateGoogleCalendarAddUrl(event: SiteEvent): string {
  const startDateFormatted = event.startDate.replace(/-/g, '');
  
  let dates: string;
  if (event.time) {
    const time = event.time.replace(':', '') + '00';
    const endTime = calculateEndTime(event.startDate, event.time).replace(':', '') + '00';
    const endDateFormatted = getEndDateAfterDuration(event.startDate, event.time).replace(/-/g, '');
    dates = `${startDateFormatted}T${time}/${endDateFormatted}T${endTime}`;
  } else {
    const nextDay = new Date(event.endDate || event.startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const endDateFormatted = nextDay.toISOString().split('T')[0].replace(/-/g, '');
    dates = `${startDateFormatted}/${endDateFormatted}`;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: dates,
    details: event.description || event.shortDescription || '',
    location: event.location || '',
    ctz: 'America/Sao_Paulo',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateGoogleCalendarSubscribeUrl(baseUrl: string): string {
  const icsUrl = `${baseUrl}/api/site/events/calendar.ics`;
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsUrl)}`;
}
