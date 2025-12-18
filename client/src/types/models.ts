/**
 * TypeScript models for the application
 * Centralized type definitions for data structures
 */

export interface Room {
  id: string
  name: string
  description: string
  isPrivate: boolean
  members: number
  maxMembers: number
  createdAt: string
  updatedAt: string
  ownerId?: string
  lastMessage?: string // Last message preview
  lastMessageTime?: string // Timestamp of last message
  unreadCount?: number // Number of unread messages
  roomLevel?: 'Normal' | 'Confidential' | 'Restricted' // Room security level / Data Classification
  classification?: 'Normal' | 'Confidential' | 'Restricted' // Data Classification Level
  memberIds?: string[] // List of member user IDs
}

export interface EventItem {
  id: string
  title: string
  description: string
  date: Date | string
  time: string
  location?: string
  attendees?: string[]
  createdAt: string
  updatedAt: string
  organizerId?: string
  creatorId?: string // User ID who created the event
  isInvite?: boolean // true if user was invited (not creator)
  inviteStatus?: 'pending' | 'accepted' | 'declined' // default "pending" when invited
  isRecurring?: boolean
  recurrenceType?: 'none' | 'daily' | 'weekly' | 'monthly' // default "none"
}

export interface FileItem {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  owner: string
  ownerId?: string
  path?: string
  url?: string
  tags?: string[]
  category?: string
  isTrashed?: boolean
  isFolder?: boolean
  deletedAt?: string
  sharedWith?: string[] // User IDs or room IDs this file is shared with
  adminLabel?: 'Important' | 'Action' | 'Plan' | 'FYI' // Admin label for shared files
  adminNote?: string // Admin note/description for shared files
  roomId?: string // Room/project this file belongs to
  instructionNote?: string // Admin instruction note for the file
  // File access permissions
  editors?: string[] // User IDs who can edit
  viewers?: string[] // User IDs who can only view
  permissionMode?: 'owner-only' | 'editors' | 'viewers' | 'public'
  editorNames?: string[] // Editor names for display
  viewerNames?: string[] // Viewer names for display
  classification?: 'Normal' | 'Confidential' | 'Restricted' // Data Classification Level
}

export interface SecurityLog {
  id: string
  timestamp: string
  event: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  source: string
  status: 'Resolved' | 'Completed' | 'Blocked' | 'Investigating' | 'Pending'
  details?: string
  userId?: string
  ipAddress?: string
}

export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: 'access' | 'view' | 'download' | 'upload' | 'delete' | 'modify' | 'share' | 'screenshot_attempt'
  resourceType: 'file' | 'room' | 'meeting' | 'user' | 'settings' | 'system'
  resourceId: string
  resourceName: string
  classification?: 'Normal' | 'Confidential' | 'Restricted'
  timestamp: string
  ipAddress?: string
  userAgent?: string
  success: boolean
  reason?: string // If access was denied, reason why
  details?: Record<string, any> // Additional details for the audit log
}

export interface AccessRule {
  id: string
  name: string
  description: string
  classification: 'Normal' | 'Confidential' | 'Restricted'
  allowedRoles: ('user' | 'admin' | 'security')[]
  allowedUsers?: string[] // Specific user IDs
  requiresMFA: boolean
  requiresApproval: boolean
  createdAt: string
  updatedAt: string
  enabled: boolean
}

export interface NotificationItem {
  id: string
  message: string
  type: 'security' | 'room' | 'meeting' | 'file' | 'system' | 'user'
  timestamp: Date | string
  read: boolean
  actionUrl?: string
  metadata?: Record<string, any>
}

export interface AdminUserMock {
  id: string
  name: string
  email: string
  role: 'Admin' | 'User' | 'Moderator' | 'Guest'
  status: 'Active' | 'Inactive' | 'Suspended'
  createdAt: string
  lastLogin?: string
  avatar?: string
}

export interface RecentActivity {
  id: string
  type: 'file' | 'room' | 'meeting' // Only opened items
  name: string
  itemId: string // ID of the file/room/event that was opened
  timestamp: Date | string
  userId?: string
}

export interface ChatMessage {
  id: string
  sender: string
  senderId?: string
  message: string
  timestamp: Date | string
  isOwn: boolean
  roomId?: string // For room chats
  recipientId?: string // For direct chats (the other person's user ID)
  read?: boolean // Whether the message has been read
}

export interface DirectChat {
  id: string // Combination of user IDs, e.g., "user1-user2" (sorted)
  userId: string // The other user's ID
  userName: string // The other user's name
  lastMessage?: string
  lastMessageTime?: string
  unreadCount?: number
}

export interface TrashItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size: number
  deletedAt: string
  originalPath?: string
  canRestore: boolean
  ownerId?: string // Owner ID for filtering
  owner?: string // Owner name for display
}

