/**
 * Firestore service layer
 * Provides real-time data synchronization across devices
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QuerySnapshot,
  DocumentSnapshot,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { getToken } from '../utils/auth'
import { getJSON, setJSON, uuid } from '../data/storage'
import { NOTIFICATIONS_KEY } from '../data/keys'

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  ROOMS: 'rooms',
  MESSAGES: 'messages',
  FILES: 'files',
  EVENTS: 'events',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'auditLogs',
  ACCESS_RULES: 'accessRules',
  RECENT_ACTIVITY: 'recentActivity'
} as const

// Helper to get current user ID
const getCurrentUserId = (): string | null => {
  try {
    const userData = localStorage.getItem('secure-web-user')
    if (userData) {
      const user = JSON.parse(userData)
      return user?.id || null
    }
  } catch (error) {
    console.error('Error getting current user ID:', error)
  }
  return null
}

// Convert Firestore timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate()
  }
  if (timestamp instanceof Date) {
    return timestamp
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp)
  }
  return new Date()
}

// Convert Date to Firestore timestamp
const dateToTimestamp = (date: Date | string): any => {
  if (typeof date === 'string') {
    return Timestamp.fromDate(new Date(date))
  }
  return Timestamp.fromDate(date)
}

// ==================== USERS ====================

/**
 * Get user by ID
 */
export async function getUser(userId: string) {
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId))
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() }
  }
  return null
}

/**
 * Get all users (for admin)
 */
export async function getAllUsers() {
  const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS))
  return usersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

/**
 * Create or update user
 */
export async function saveUser(userData: any) {
  try {
    const userId = userData.id
    if (!userId) {
      throw new Error('User ID is required')
    }
    
    // Check if db is valid
    if (!db || typeof db === 'object' && Object.keys(db).length === 0) {
      console.warn('Firestore db not initialized, skipping saveUser')
      return { id: userId, ...userData }
    }
    
    const userRef = doc(db, COLLECTIONS.USERS, userId)
    await setDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    }, { merge: true })
    
    return { id: userId, ...userData }
  } catch (error) {
    console.error('Error saving user to Firestore:', error)
    // Return user data even if Firestore fails
    return { id: userData.id, ...userData }
  }
}

/**
 * Update user online status
 */
export async function updateUserPresence(userId: string, isOnline: boolean) {
  try {
    // Check if db is valid
    if (!db || typeof db === 'object' && Object.keys(db).length === 0) {
      console.warn('Firestore db not initialized, skipping updateUserPresence')
      return
    }
    
    const userRef = doc(db, COLLECTIONS.USERS, userId)
    await updateDoc(userRef, {
      isOnline,
      lastSeen: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating user presence:', error)
    // Silently fail - presence updates are not critical
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId: string) {
  await deleteDoc(doc(db, COLLECTIONS.USERS, userId))
}

/**
 * Listen to all users (real-time)
 */
export function subscribeToUsers(callback: (users: any[]) => void) {
  return onSnapshot(collection(db, COLLECTIONS.USERS), (snapshot) => {
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    callback(users)
  })
}

/**
 * Listen to a specific user (real-time)
 */
export function subscribeToUser(userId: string, callback: (user: any | null) => void) {
  return onSnapshot(doc(db, COLLECTIONS.USERS, userId), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() })
    } else {
      callback(null)
    }
  })
}

// ==================== ROOMS ====================

/**
 * Get all rooms
 */
export async function getRooms() {
  const roomsSnapshot = await getDocs(collection(db, COLLECTIONS.ROOMS))
  return roomsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

/**
 * Get room by ID
 */
export async function getRoom(roomId: string) {
  const roomDoc = await getDoc(doc(db, COLLECTIONS.ROOMS, roomId))
  if (roomDoc.exists()) {
    return { id: roomDoc.id, ...roomDoc.data() }
  }
  return null
}

/**
 * Create room
 */
export async function createRoom(roomData: any) {
  const userId = getCurrentUserId()
  const roomRef = doc(collection(db, COLLECTIONS.ROOMS))
  
  await setDoc(roomRef, {
    ...roomData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId
  })
  
  return { id: roomRef.id, ...roomData }
}

/**
 * Update room
 */
export async function updateRoom(roomId: string, updates: any) {
  const roomRef = doc(db, COLLECTIONS.ROOMS, roomId)
  await updateDoc(roomRef, {
    ...updates,
    updatedAt: serverTimestamp()
  })
}

/**
 * Delete room
 */
export async function deleteRoom(roomId: string) {
  await deleteDoc(doc(db, COLLECTIONS.ROOMS, roomId))
}

/**
 * Listen to all rooms (real-time)
 */
export function subscribeToRooms(callback: (rooms: any[]) => void) {
  return onSnapshot(
    query(collection(db, COLLECTIONS.ROOMS), orderBy('updatedAt', 'desc')),
    (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        updatedAt: timestampToDate(doc.data().updatedAt)
      }))
      callback(rooms)
    }
  )
}

/**
 * Listen to a specific room (real-time)
 */
export function subscribeToRoom(roomId: string, callback: (room: any | null) => void) {
  return onSnapshot(doc(db, COLLECTIONS.ROOMS, roomId), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data()
      callback({
        id: snapshot.id,
        ...data,
        updatedAt: timestampToDate(data.updatedAt),
        createdAt: timestampToDate(data.createdAt)
      })
    } else {
      callback(null)
    }
  })
}

// ==================== MESSAGES ====================

/**
 * Get messages for a room
 */
export async function getMessages(roomId: string, limitCount: number = 100) {
  const messagesQuery = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('roomId', '==', roomId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  )
  
  const messagesSnapshot = await getDocs(messagesQuery)
  return messagesSnapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      timestamp: timestampToDate(data.timestamp)
    }
  }).reverse() // Reverse to show oldest first
}

/**
 * Send a message
 */
export async function sendMessage(roomId: string, messageData: any) {
  const userId = getCurrentUserId()
  const messagesRef = collection(db, COLLECTIONS.MESSAGES)
  
  const newMessage = {
    ...messageData,
    roomId,
    userId,
    timestamp: serverTimestamp(),
    readBy: [userId],
    readCount: 1
  }
  
  const docRef = await addDoc(messagesRef, newMessage)
  
  // Update room's last message
  await updateRoom(roomId, {
    lastMessage: messageData.text || messageData.content || '',
    lastMessageTime: serverTimestamp(),
    unreadCount: increment(1) // Increment for other users
  })
  
  return { id: docRef.id, ...newMessage }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string, userId: string) {
  const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId)
  await updateDoc(messageRef, {
    readBy: arrayUnion(userId),
    readCount: increment(1)
  })
}

/**
 * Listen to messages in a room (real-time)
 */
export function subscribeToMessages(roomId: string, callback: (messages: any[]) => void) {
  if (!db) {
    return () => {}
  }
  
  const messagesQuery = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('roomId', '==', roomId),
    orderBy('timestamp', 'asc')
  )
  
  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        timestamp: timestampToDate(data.timestamp)
      }
    })
    callback(messages)
  })
}

/**
 * Send a direct message (between two users)
 */
export async function sendDirectMessage(senderId: string, recipientId: string, messageData: any) {
  if (!db) {
    return null
  }
  
  const messagesRef = collection(db, COLLECTIONS.MESSAGES)
  
  // Create a composite roomId for direct messages (sorted user IDs)
  const directRoomId = [senderId, recipientId].sort().join('-')
  
  const newMessage = {
    ...messageData,
    senderId,
    recipientId,
    userId: senderId, // For compatibility
    roomId: `direct-${directRoomId}`, // Use composite roomId for direct messages
    timestamp: serverTimestamp(),
    readBy: [senderId],
    readCount: 1
  }
  
  const docRef = await addDoc(messagesRef, newMessage)
  
  return { id: docRef.id, ...newMessage }
}

/**
 * Listen to direct messages between two users (real-time)
 */
export function subscribeToDirectMessages(userId1: string, userId2: string, callback: (messages: any[]) => void) {
  if (!db) {
    return () => {}
  }
  
  // Create composite roomId for direct messages (sorted user IDs)
  const directRoomId = `direct-${[userId1, userId2].sort().join('-')}`
  
  // Query for messages with this composite roomId
  const messagesQuery = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('roomId', '==', directRoomId),
    orderBy('timestamp', 'asc')
  )
  
  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        timestamp: timestampToDate(data.timestamp)
      }
    })
    callback(messages)
  })
}

// ==================== FILES ====================

/**
 * Get all files
 */
export async function getFiles(userId?: string) {
  let filesQuery = query(collection(db, COLLECTIONS.FILES), orderBy('createdAt', 'desc'))
  
  if (userId) {
    filesQuery = query(
      collection(db, COLLECTIONS.FILES),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
  }
  
  const filesSnapshot = await getDocs(filesQuery)
  return filesSnapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt)
    }
  })
}

/**
 * Upload file metadata
 */
export async function uploadFile(fileData: any) {
  const userId = getCurrentUserId()
  const filesRef = collection(db, COLLECTIONS.FILES)
  
  const newFile = {
    ...fileData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
  
  const docRef = await addDoc(filesRef, newFile)
  return { id: docRef.id, ...newFile }
}

/**
 * Update file
 */
export async function updateFile(fileId: string, updates: any) {
  const fileRef = doc(db, COLLECTIONS.FILES, fileId)
  await updateDoc(fileRef, {
    ...updates,
    updatedAt: serverTimestamp()
  })
}

/**
 * Delete file
 */
export async function deleteFile(fileId: string) {
  await deleteDoc(doc(db, COLLECTIONS.FILES, fileId))
}

/**
 * Listen to files (real-time)
 */
export function subscribeToFiles(userId: string | null, callback: (files: any[]) => void) {
  let filesQuery = query(collection(db, COLLECTIONS.FILES), orderBy('createdAt', 'desc'))
  
  if (userId) {
    filesQuery = query(
      collection(db, COLLECTIONS.FILES),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
  }
  
  return onSnapshot(filesQuery, (snapshot) => {
    const files = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt)
      }
    })
    callback(files)
  })
}

// ==================== EVENTS ====================

/**
 * Get all events
 */
export async function getEvents(userId?: string) {
  let eventsQuery = query(collection(db, COLLECTIONS.EVENTS), orderBy('date', 'desc'))
  
  if (userId) {
    eventsQuery = query(
      collection(db, COLLECTIONS.EVENTS),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    )
  }
  
  const eventsSnapshot = await getDocs(eventsQuery)
  return eventsSnapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      date: timestampToDate(data.date),
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt)
    }
  })
}

/**
 * Create event
 */
export async function createEvent(eventData: any) {
  const userId = getCurrentUserId()
  const eventsRef = collection(db, COLLECTIONS.EVENTS)
  
  const newEvent = {
    ...eventData,
    userId,
    creatorId: userId,
    date: dateToTimestamp(eventData.date),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
  
  const docRef = await addDoc(eventsRef, newEvent)
  return { id: docRef.id, ...newEvent }
}

/**
 * Update event
 */
export async function updateEvent(eventId: string, updates: any) {
  const eventRef = doc(db, COLLECTIONS.EVENTS, eventId)
  const updateData: any = {
    ...updates,
    updatedAt: serverTimestamp()
  }
  
  if (updates.date) {
    updateData.date = dateToTimestamp(updates.date)
  }
  
  await updateDoc(eventRef, updateData)
}

/**
 * Delete event
 */
export async function deleteEvent(eventId: string) {
  await deleteDoc(doc(db, COLLECTIONS.EVENTS, eventId))
}

/**
 * Listen to events (real-time)
 */
export function subscribeToEvents(userId: string | null, callback: (events: any[]) => void) {
  let eventsQuery = query(collection(db, COLLECTIONS.EVENTS), orderBy('date', 'asc'))
  
  if (userId) {
    eventsQuery = query(
      collection(db, COLLECTIONS.EVENTS),
      where('userId', '==', userId),
      orderBy('date', 'asc')
    )
  }
  
  return onSnapshot(eventsQuery, (snapshot) => {
    const events = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        date: timestampToDate(data.date),
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt)
      }
    })
    callback(events)
  })
}

// ==================== NOTIFICATIONS ====================

/**
 * Get notifications for user
 */
export async function getNotifications(userId: string) {
  const notificationsQuery = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(50)
  )
  
  const notificationsSnapshot = await getDocs(notificationsQuery)
  return notificationsSnapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      timestamp: timestampToDate(data.timestamp)
    }
  })
}

/**
 * Create notification
 */
export async function createNotification(notificationData: any) {
  try {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS)
    const newNotification = {
      ...notificationData,
      read: false,
      timestamp: serverTimestamp()
    }
    
    const docRef = await addDoc(notificationsRef, newNotification)
    
    // Also save to localStorage as fallback
    try {
      const existing = getJSON<any[]>(NOTIFICATIONS_KEY, []) || []
      const notificationWithId = {
        id: docRef.id,
        ...notificationData,
        read: false,
        timestamp: new Date().toISOString()
      }
      setJSON(NOTIFICATIONS_KEY, [...existing, notificationWithId])
    } catch (localError) {
      console.error('Error saving notification to localStorage:', localError)
    }
    
    return { id: docRef.id, ...newNotification }
  } catch (error) {
    console.error('Error creating notification in Firestore:', error)
    // Fallback to localStorage only
    try {
      const existing = getJSON<any[]>(NOTIFICATIONS_KEY, []) || []
      const notificationWithId = {
        id: uuid(),
        ...notificationData,
        read: false,
        timestamp: new Date().toISOString()
      }
      setJSON(NOTIFICATIONS_KEY, [...existing, notificationWithId])
      return notificationWithId
    } catch (localError) {
      console.error('Error saving notification to localStorage:', localError)
      throw error
    }
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId)
  await updateDoc(notificationRef, {
    read: true,
    readAt: serverTimestamp()
  })
}

/**
 * Listen to notifications (real-time)
 */
export function subscribeToNotifications(userId: string, callback: (notifications: any[]) => void) {
  const notificationsQuery = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(50)
  )
  
  return onSnapshot(notificationsQuery, (snapshot) => {
    const notifications = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        timestamp: timestampToDate(data.timestamp),
        readAt: data.readAt ? timestampToDate(data.readAt) : null
      }
    })
    callback(notifications)
  })
}

// ==================== AUDIT LOGS ====================

/**
 * Create audit log
 */
export async function createAuditLog(auditLogData: any) {
  const auditLogsRef = collection(db, COLLECTIONS.AUDIT_LOGS)
  const newLog = {
    ...auditLogData,
    timestamp: serverTimestamp()
  }
  
  const docRef = await addDoc(auditLogsRef, newLog)
  return { id: docRef.id, ...newLog }
}

/**
 * Get audit logs
 */
export async function getAuditLogs(filters?: { userId?: string; action?: string; limit?: number }) {
  let auditLogsQuery = query(collection(db, COLLECTIONS.AUDIT_LOGS), orderBy('timestamp', 'desc'))
  
  if (filters?.userId) {
    auditLogsQuery = query(
      collection(db, COLLECTIONS.AUDIT_LOGS),
      where('userId', '==', filters.userId),
      orderBy('timestamp', 'desc')
    )
  }
  
  if (filters?.limit) {
    auditLogsQuery = query(auditLogsQuery, limit(filters.limit))
  }
  
  const auditLogsSnapshot = await getDocs(auditLogsQuery)
  return auditLogsSnapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      timestamp: timestampToDate(data.timestamp)
    }
  })
}

// ==================== RECENT ACTIVITY ====================

/**
 * Track recent activity
 */
export async function trackRecentActivity(activityData: any) {
  const userId = getCurrentUserId()
  const recentActivityRef = collection(db, COLLECTIONS.RECENT_ACTIVITY)
  
  const newActivity = {
    ...activityData,
    userId,
    timestamp: serverTimestamp()
  }
  
  const docRef = await addDoc(recentActivityRef, newActivity)
  return { id: docRef.id, ...newActivity }
}

/**
 * Get recent activity for user
 */
export async function getRecentActivity(userId: string, limitCount: number = 50) {
  const recentActivityQuery = query(
    collection(db, COLLECTIONS.RECENT_ACTIVITY),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  )
  
  const recentActivitySnapshot = await getDocs(recentActivityQuery)
  return recentActivitySnapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      timestamp: timestampToDate(data.timestamp)
    }
  })
}

