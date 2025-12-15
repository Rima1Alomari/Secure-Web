/**
 * Utility to track when files, rooms, or meetings are opened
 * Stores recent opened items in localStorage
 */

import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { RECENT_OPENED_KEY } from '../data/keys'
import { RecentActivity } from '../types/models'

/**
 * Track when a file is opened
 */
export function trackFileOpened(fileId: string, fileName: string, userId?: string) {
  const allOpened = getJSON<RecentActivity[]>(RECENT_OPENED_KEY, []) || []
  
  // Remove existing entry for this file (to avoid duplicates)
  const filtered = allOpened.filter(item => !(item.type === 'file' && item.itemId === fileId && item.userId === userId))
  
  const newEntry: RecentActivity = {
    id: uuid(),
    type: 'file',
    name: fileName,
    itemId: fileId,
    timestamp: nowISO(),
    userId,
  }
  
  // Add to beginning and keep only last 50
  const updated = [newEntry, ...filtered].slice(0, 50)
  setJSON(RECENT_OPENED_KEY, updated)
}

/**
 * Track when a room is opened
 */
export function trackRoomOpened(roomId: string, roomName: string, userId?: string) {
  const allOpened = getJSON<RecentActivity[]>(RECENT_OPENED_KEY, []) || []
  
  // Remove existing entry for this room
  const filtered = allOpened.filter(item => !(item.type === 'room' && item.itemId === roomId && item.userId === userId))
  
  const newEntry: RecentActivity = {
    id: uuid(),
    type: 'room',
    name: roomName,
    itemId: roomId,
    timestamp: nowISO(),
    userId,
  }
  
  const updated = [newEntry, ...filtered].slice(0, 50)
  setJSON(RECENT_OPENED_KEY, updated)
}

/**
 * Track when a meeting/event is opened
 */
export function trackMeetingOpened(eventId: string, eventTitle: string, userId?: string) {
  const allOpened = getJSON<RecentActivity[]>(RECENT_OPENED_KEY, []) || []
  
  // Remove existing entry for this event
  const filtered = allOpened.filter(item => !(item.type === 'meeting' && item.itemId === eventId && item.userId === userId))
  
  const newEntry: RecentActivity = {
    id: uuid(),
    type: 'meeting',
    name: eventTitle,
    itemId: eventId,
    timestamp: nowISO(),
    userId,
  }
  
  const updated = [newEntry, ...filtered].slice(0, 50)
  setJSON(RECENT_OPENED_KEY, updated)
}

