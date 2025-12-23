import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaPlus, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaEdit, FaTrash, FaTimes, FaVideo, FaChevronDown, FaUsers, FaUserFriends, FaSearch, FaLink, FaCheck, FaTimesCircle, FaCalendarCheck, FaExclamationTriangle } from 'react-icons/fa'
import { Modal, Toast, ConfirmDialog } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { EVENTS_KEY, ADMIN_USERS_KEY, ROOMS_KEY } from '../data/keys'
import { EventItem, AdminUserMock, Room } from '../types/models'
import { useUser } from '../contexts/UserContext'
import { trackMeetingOpened } from '../utils/recentTracker'

type ViewMode = 'month' | 'week' | 'day'

interface Event extends EventItem {
  from?: string
  to?: string
  showAs?: 'busy' | 'free'
  sharedWith?: string[]
  color?: string
  isOnline?: boolean
  meetingLink?: string
  invitedGroup?: string
  type?: 'meeting' | 'event' // Store type for proper modal title
}

const Calendar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { role, user } = useUser()
  const isAdmin = role === 'admin'
  
  // Check if dark mode is active
  const isDark = document.documentElement.classList.contains('dark')
  
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
  const [showDayEventsModal, setShowDayEventsModal] = useState(false)
  const [showDayEventsBar, setShowDayEventsBar] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [showNewDropdown, setShowNewDropdown] = useState(false)
  const [isDateLocked, setIsDateLocked] = useState(false)
  const [eventType, setEventType] = useState<'meeting' | 'event'>('meeting')
  const [inviteUserSearch, setInviteUserSearch] = useState('')
  const [invitedUsers, setInvitedUsers] = useState<string[]>([])
  const [invitedGroup, setInvitedGroup] = useState<string>('')
  const newDropdownRef = useRef<HTMLDivElement>(null)
  const [bestTimeSuggestions, setBestTimeSuggestions] = useState<Array<{ date: string; time: string; score: number }>>([])
  const [bestTimeLoading, setBestTimeLoading] = useState(false)
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: (() => {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })(),
    from: '09:00',
    to: '10:00',
    location: '',
    showAs: 'busy' as 'busy' | 'free',
    sharedWith: [] as string[],
    color: '#3B82F6', // Default blue
    isOnline: false,
    meetingLink: '',
    isRecurring: false,
    recurrenceType: 'none' as 'none' | 'daily' | 'weekly' | 'monthly'
  })

  // Get all users and rooms for invite functionality
  const allUsers = useMemo(() => {
    return getJSON<AdminUserMock[]>(ADMIN_USERS_KEY, []) || []
  }, [])

  const allRooms = useMemo(() => {
    return getJSON<Room[]>(ROOMS_KEY, []) || []
  }, [])

  // Filter users for invite search
  const filteredUsersForInvite = useMemo(() => {
    if (!inviteUserSearch.trim()) return []
    const query = inviteUserSearch.toLowerCase()
    return allUsers
      .filter(u => !invitedUsers.includes(u.id) && (u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)))
      .slice(0, 10)
  }, [allUsers, inviteUserSearch, invitedUsers])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newDropdownRef.current && !newDropdownRef.current.contains(event.target as Node)) {
        setShowNewDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load events from localStorage
  useEffect(() => {
    const savedEvents = getJSON<Event[]>(EVENTS_KEY, []) || []
    const eventsWithDates = savedEvents.map(e => ({
      ...e,
      date: typeof e.date === 'string' ? new Date(e.date) : e.date
    }))
    setEvents(eventsWithDates)
    
    // Handle focusEventId from Dashboard navigation
    const focusEventId = (location.state as any)?.focusEventId
    if (focusEventId) {
      const eventToFocus = eventsWithDates.find(e => e.id === focusEventId)
      if (eventToFocus) {
        setSelectedDate(new Date(eventToFocus.date))
        setCurrentDate(new Date(eventToFocus.date))
        setSelectedEvent(eventToFocus)
        setShowEventDetailsModal(true)
      }
    }
    
    // Handle roomId from RoomDetails navigation
    const roomId = (location.state as any)?.roomId
    if (roomId && isAdmin) {
      setNewEvent({
        ...newEvent,
        description: `Room: ${roomId}\n${newEvent.description || ''}`.trim()
      })
      ;(newEvent as any).roomId = roomId
      setShowCreateModal(true)
    }
  }, [location.state, isAdmin])

  // Save events to localStorage whenever events change
  useEffect(() => {
    if (events.length > 0) {
      const eventsForStorage = events.map(e => ({
        ...e,
        date: e.date instanceof Date ? e.date.toISOString() : e.date
      }))
      setJSON(EVENTS_KEY, eventsForStorage)
    }
  }, [events])

  const handleCreateMeeting = () => {
    setEventType('meeting')
    setShowNewDropdown(false)
    setIsDateLocked(false) // Allow date change when opened from +New button
    setShowCreateModal(true)
    // Reset form
    setNewEvent({
      title: '',
      description: '',
      date: formatDateLocal(new Date()),
      from: '09:00',
      to: '10:00',
      location: '',
      showAs: 'busy',
      sharedWith: [],
      color: '#3B82F6',
      isOnline: false,
      meetingLink: '',
      isRecurring: false,
      recurrenceType: 'none'
    })
    setInvitedUsers([])
    setInvitedGroup('')
  }

  const handleCreateEvent = () => {
    setEventType('event')
    setShowNewDropdown(false)
    setIsDateLocked(false) // Allow date change when opened from +New button
    setShowCreateModal(true)
    // Reset form
    setNewEvent({
      title: '',
      description: '',
      date: formatDateLocal(new Date()),
      from: '09:00',
      to: '10:00',
      location: '',
      showAs: 'busy',
      sharedWith: [],
      color: '#3B82F6',
      isOnline: false,
      meetingLink: '',
      isRecurring: false,
      recurrenceType: 'none'
    })
    setInvitedUsers([])
    setInvitedGroup('')
  }

  const handleSaveEvent = () => {
    if (!newEvent.title.trim() || !newEvent.from || !newEvent.to) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
    }

    // Validate date is not in the past
    const selectedDate = new Date(newEvent.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    selectedDate.setHours(0, 0, 0, 0)
    
    if (selectedDate < today) {
      setToast({ message: 'Cannot create meetings in the past. Please select today or a future date.', type: 'error' })
      return
    }

    // Validate that date is not Friday or Saturday (weekends are off days)
    if (isWeekend(selectedDate)) {
      setToast({ message: 'Fridays and Saturdays are off days. Meetings cannot be scheduled on these days.', type: 'error' })
      return
    }

    // Check for time conflicts with existing meetings
    const existingMeetings = getEventsForDate(selectedDate)
    const hasConflict = existingMeetings.some(meeting => {
      const meetingFrom = meeting.from || meeting.time.split(' - ')[0] || '00:00'
      const meetingTo = meeting.to || meeting.time.split(' - ')[1] || '23:59'
      
      // Check if times overlap
      return (newEvent.from < meetingTo && newEvent.to > meetingFrom)
    })

    if (hasConflict) {
      setToast({ message: 'This time conflicts with an existing meeting. Please choose a different time.', type: 'error' })
      return
    }

    // Validate time is not in the past if date is today
    if (selectedDate.toDateString() === today.toDateString()) {
      const now = new Date()
      const [fromHour, fromMinute] = newEvent.from.split(':').map(Number)
      const eventStartTime = new Date(now)
      eventStartTime.setHours(fromHour, fromMinute, 0, 0)
      
      if (eventStartTime < now) {
        setToast({ message: 'Cannot create events with past times', type: 'error' })
        return
      }
    }

    // Don't auto-generate meeting links - removed per user request
    const meetingLink = undefined

    const roomId = (location.state as any)?.roomId || (newEvent as any).roomId
    const event: Event = {
      id: uuid(),
      title: newEvent.title,
      description: newEvent.description,
      date: new Date(newEvent.date),
      time: `${newEvent.from} - ${newEvent.to}`,
      from: newEvent.from,
      to: newEvent.to,
      location: newEvent.location || undefined,
      showAs: newEvent.showAs,
      sharedWith: [...newEvent.sharedWith, ...invitedUsers],
      createdAt: nowISO(),
      updatedAt: nowISO(),
      creatorId: user?.id, // Set creator ID
      color: newEvent.color,
      isOnline: newEvent.isOnline,
      meetingLink: meetingLink || undefined,
      invitedGroup: invitedGroup || undefined,
      isRecurring: newEvent.isRecurring,
      recurrenceType: newEvent.recurrenceType,
      type: eventType, // Store type (meeting or event)
      // For invited users, set isInvite and inviteStatus
      isInvite: false, // Creator is not invited
      inviteStatus: undefined // No status for creator
    } as any

    // Add creator's event
    const newEvents = [event]

    // For each invited user, create an event copy with invite status (only if not daily recurring)
    if (invitedUsers.length > 0 && newEvent.recurrenceType !== 'daily') {
      invitedUsers.forEach(userId => {
        const inviteEvent: Event = {
          ...event,
          id: uuid(), // New ID for each invite
          creatorId: user?.id, // Original creator
          type: eventType, // Preserve type
          isInvite: true,
          inviteStatus: 'pending'
        }
        newEvents.push(inviteEvent)
      })
    }
    
    if (roomId) {
      newEvents.forEach(e => {
        (e as any).roomId = roomId
        if (!e.description) {
          e.description = `Room: ${roomId}`
        } else if (!e.description.includes(`Room: ${roomId}`)) {
          e.description = `Room: ${roomId}\n${e.description}`
        }
      })
    }

    setEvents([...events, ...newEvents])
    setToast({ message: `${eventType === 'meeting' ? 'Meeting' : 'Event'} created successfully`, type: 'success' })
    setNewEvent({
      title: '',
      description: '',
      date: formatDateLocal(new Date()),
      from: '09:00',
      to: '10:00',
      location: '',
      showAs: 'busy',
      sharedWith: [],
      color: '#3B82F6',
      isOnline: false,
      meetingLink: '',
      isRecurring: false,
      recurrenceType: 'none'
    })
    setInvitedUsers([])
    setInvitedGroup('')
    setShowCreateModal(false)
  }

  const handleDeleteEvent = (eventId: string) => {
    const updatedEvents = events.filter(e => e.id !== eventId)
    setEvents(updatedEvents)
    
    // Immediately update localStorage to sync with Dashboard
    const allEvents = getJSON<Event[]>(EVENTS_KEY, []) || []
    const updatedStorageEvents = allEvents.filter(e => e.id !== eventId)
    setJSON(EVENTS_KEY, updatedStorageEvents)
    
    setToast({ message: 'Event deleted', type: 'success' })
    setShowEventDetailsModal(false)
    setSelectedEvent(null)
    
    // Trigger a custom event to notify Dashboard to refresh
    window.dispatchEvent(new CustomEvent('events-updated'))
  }

  const handleEditEvent = () => {
    if (!selectedEvent || !isAdmin) return
    // Use stored type or determine from event properties
    const storedType = (selectedEvent as any).type || ((selectedEvent as any).isOnline || (selectedEvent as any).meetingLink ? 'meeting' : 'event')
    setEventType(storedType)
    setNewEvent({
      title: selectedEvent.title,
      description: selectedEvent.description,
      date: selectedEvent.date instanceof Date 
        ? formatDateLocal(selectedEvent.date)
        : formatDateLocal(new Date(selectedEvent.date)),
      from: selectedEvent.from || selectedEvent.time.split(' - ')[0] || '09:00',
      to: selectedEvent.to || selectedEvent.time.split(' - ')[1] || '10:00',
      location: selectedEvent.location || '',
      showAs: selectedEvent.showAs || 'busy',
      sharedWith: selectedEvent.sharedWith || [],
      color: (selectedEvent as any).color || '#3B82F6',
      isOnline: (selectedEvent as any).isOnline || false,
      meetingLink: (selectedEvent as any).meetingLink || '',
      isRecurring: (selectedEvent as any).isRecurring || false,
      recurrenceType: (selectedEvent as any).recurrenceType || 'none'
    })
    setInvitedUsers((selectedEvent.sharedWith || []) as string[])
    setInvitedGroup((selectedEvent as any).invitedGroup || '')
    setIsDateLocked(false) // Allow date change when editing
    setShowEventDetailsModal(false)
    setShowCreateModal(true)
    setSelectedEvent(null)
  }

  const handleUpdateEvent = () => {
    if (!selectedEvent || !newEvent.title.trim() || !isAdmin) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
    }

    // Validate date is not in the past (unless editing existing event that's already in the past)
    const selectedDate = new Date(newEvent.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const originalDate = selectedEvent.date instanceof Date ? selectedEvent.date : new Date(selectedEvent.date)
    originalDate.setHours(0, 0, 0, 0)
    
    // Only validate if the new date is in the past AND the original date was not in the past
    if (selectedDate < today && originalDate >= today) {
      setToast({ message: 'Cannot move events to past dates', type: 'error' })
      return
    }

    // Validate that date is not Friday or Saturday (weekends are off days)
    if (isWeekend(selectedDate)) {
      setToast({ message: 'Fridays and Saturdays are off days. Meetings cannot be scheduled on these days.', type: 'error' })
      return
    }

    // Check for time conflicts with existing meetings (excluding the event being edited)
    const existingMeetings = getEventsForDate(selectedDate).filter(e => e.id !== selectedEvent.id)
    const hasConflict = existingMeetings.some(meeting => {
      const meetingFrom = meeting.from || meeting.time.split(' - ')[0] || '00:00'
      const meetingTo = meeting.to || meeting.time.split(' - ')[1] || '23:59'
      
      // Check if times overlap
      return (newEvent.from < meetingTo && newEvent.to > meetingFrom)
    })

    if (hasConflict) {
      setToast({ message: 'This time conflicts with an existing meeting. Please choose a different time.', type: 'error' })
      return
    }

    // Validate time is not in the past if date is today
    if (selectedDate.toDateString() === today.toDateString()) {
      const now = new Date()
      const [fromHour, fromMinute] = newEvent.from.split(':').map(Number)
      const eventStartTime = new Date(now)
      eventStartTime.setHours(fromHour, fromMinute, 0, 0)
      
      // Only validate if original event was not in the past
      if (eventStartTime < now && originalDate >= today) {
        setToast({ message: 'Cannot set event time in the past', type: 'error' })
        return
      }
    }

    // Don't auto-generate meeting links - removed per user request
    const meetingLink = undefined

    // Create new event with updated data (delete old, add new)
    const editedEvent: Event = {
      ...selectedEvent,
      id: selectedEvent.id, // Keep same ID
      title: newEvent.title,
      description: newEvent.description,
      date: new Date(newEvent.date),
      time: `${newEvent.from} - ${newEvent.to}`,
      from: newEvent.from,
      to: newEvent.to,
      location: newEvent.location || undefined,
      showAs: newEvent.showAs,
      sharedWith: [...newEvent.sharedWith, ...invitedUsers],
      updatedAt: nowISO(),
      color: newEvent.color,
      isOnline: newEvent.isOnline,
      meetingLink: meetingLink || undefined,
      invitedGroup: invitedGroup || undefined,
      isRecurring: newEvent.isRecurring,
      recurrenceType: newEvent.recurrenceType,
      type: eventType // Preserve type
    } as any

    // Delete the old event and add the edited one
    const updatedEvents = events.filter(e => e.id !== selectedEvent.id)
    setEvents([...updatedEvents, editedEvent])
    
    // Update localStorage immediately
    const allEvents = getJSON<Event[]>(EVENTS_KEY, []) || []
    const updatedStorageEvents = allEvents.filter(e => e.id !== selectedEvent.id)
    setJSON(EVENTS_KEY, [...updatedStorageEvents, editedEvent])
    
    // Trigger event update for Dashboard
    window.dispatchEvent(new CustomEvent('events-updated'))
    
    setToast({ message: `${eventType === 'meeting' ? 'Meeting' : 'Event'} edited successfully`, type: 'success' })
    setShowCreateModal(false)
    setSelectedEvent(null)
    setNewEvent({
      title: '',
      description: '',
      date: formatDateLocal(new Date()),
      from: '09:00',
      to: '10:00',
      location: '',
      showAs: 'busy',
      sharedWith: [],
      color: '#3B82F6',
      isOnline: false,
      meetingLink: '',
      isRecurring: false,
      recurrenceType: 'none'
    })
    setInvitedUsers([])
    setInvitedGroup('')
  }

  // Check if a date is Friday (5) or Saturday (6) - weekends are off days
  const isWeekend = (date: Date) => {
    const dayOfWeek = date.getDay()
    return dayOfWeek === 5 || dayOfWeek === 6 // Friday = 5, Saturday = 6
  }

  // Check if a date is in the past (before today)
  const isPastDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  // Check if a date is disabled (past date or weekend)
  const isDateDisabled = (date: Date) => {
    return isPastDate(date) || isWeekend(date)
  }

  // Format date to YYYY-MM-DD in local timezone (not UTC)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleDateClick = (date: Date) => {
    // Don't allow clicking on past dates
    if (isPastDate(date)) {
      setToast({ message: 'Cannot create meetings in the past. Please select today or a future date.', type: 'warning' })
      return
    }
    
    // Don't allow clicking on weekends (Fridays and Saturdays)
    if (isWeekend(date)) {
      setToast({ message: 'Fridays and Saturdays are off days. Meetings cannot be scheduled on these days.', type: 'warning' })
      return
    }
    
    setSelectedDate(date)
    
    // Always show the events bar when clicking a day
    // User can view existing meetings and add more from the sidebar
    setShowDayEventsBar(true)
  }

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setShowEventDetailsModal(true)
    // Track meeting opened
    if (user?.id) {
      trackMeetingOpened(event.id, event.title, user.id)
    }
  }


  // Calculate best time suggestions based on existing meetings and working hours
  const calculateBestTimeSuggestions = () => {
    if (!user?.id) return
    
    setBestTimeLoading(true)
    
    try {
      const allEvents = getJSON<Event[]>(EVENTS_KEY, []) || []
      const now = new Date()
      const workingHours = { start: 9, end: 17 } // 9 AM to 5 PM
      const meetingDuration = 60 // Default 60 minutes
      const suggestions: Array<{ date: string; time: string; score: number }> = []
      
      // Get current time components for comparison
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentTimeMinutes = currentHour * 60 + currentMinute
      
      // Get user's existing meetings for the next 7 days
      const userMeetings = allEvents.filter(e => {
        if (e.creatorId !== user.id && !(e.sharedWith && e.sharedWith.includes(user.id))) return false
        const eventDate = e.date instanceof Date ? e.date : new Date(e.date)
        return eventDate >= now && eventDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      })
      
      // Generate suggestions for next 7 days (start from today, but skip past times)
      // IMPORTANT: Only suggest future dates, never past dates
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      
      for (let day = 0; day < 7; day++) {
        const checkDate = new Date(now)
        checkDate.setDate(now.getDate() + day)
        checkDate.setHours(0, 0, 0, 0)
        
        // Skip if date is in the past (shouldn't happen, but safety check)
        if (checkDate < today) {
          continue
        }
        
        const isToday = checkDate.toDateString() === today.toDateString()
        
        // Get meetings for this day
        const dayMeetings = userMeetings.filter(e => {
          const eventDate = e.date instanceof Date ? e.date : new Date(e.date)
          return eventDate.toDateString() === checkDate.toDateString()
        }).map(e => {
          const timeStr = e.time || '09:00 - 10:00'
          const [from, to] = timeStr.split(' - ')
          return {
            from: from || '09:00',
            to: to || '10:00'
          }
        })
        
        // Find free time slots
        for (let hour = workingHours.start; hour < workingHours.end; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const slotStart = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
            const slotEndHour = Math.floor((hour * 60 + minute + meetingDuration) / 60)
            const slotEndMinute = (hour * 60 + minute + meetingDuration) % 60
            const slotEnd = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMinute.toString().padStart(2, '0')}`
            
            // Skip past time slots for today
            if (isToday) {
              const slotStartMinutes = hour * 60 + minute
              // Add 15 minutes buffer to current time
              if (slotStartMinutes <= currentTimeMinutes + 15) {
                continue // Skip this slot, it's in the past
              }
            }
            
            // Check if slot conflicts with existing meetings
            const hasConflict = dayMeetings.some(meeting => {
              const meetingStart = meeting.from
              const meetingEnd = meeting.to
              return (slotStart < meetingEnd && slotEnd > meetingStart)
            })
            
            if (!hasConflict && slotEndHour <= workingHours.end) {
              // Calculate score (prefer morning slots, avoid late afternoon)
              let score = 100
              if (hour < 11) score += 20 // Morning preference
              else if (hour >= 14 && hour < 16) score += 10 // Afternoon
              else if (hour >= 16) score -= 10 // Late afternoon penalty
              
              // Prefer earlier dates
              if (day === 0) score += 10 // Today gets bonus if time is valid
              else if (day === 1) score += 5 // Tomorrow gets small bonus
              
              suggestions.push({
                date: formatDateLocal(checkDate),
                time: `${slotStart} - ${slotEnd}`,
                score: score
              })
            }
          }
        }
      }
      
      // Filter out any past dates (safety check)
      // Reuse the 'today' variable already declared above
      const validSuggestions = suggestions.filter(suggestion => {
        const suggestionDate = new Date(suggestion.date)
        suggestionDate.setHours(0, 0, 0, 0)
        return suggestionDate >= today
      })
      
      // Sort by score and date, take top 5
      const sortedSuggestions = validSuggestions
        .sort((a, b) => {
          if (a.date !== b.date) {
            return a.date.localeCompare(b.date)
          }
          return b.score - a.score
        })
        .slice(0, 5)
      
      setBestTimeSuggestions(sortedSuggestions)
    } catch (error) {
      console.error('Error calculating best time suggestions:', error)
      setBestTimeSuggestions([])
    } finally {
      setBestTimeLoading(false)
    }
  }

  // Auto-calculate suggestions when modal opens for new meetings
  useEffect(() => {
    if (showCreateModal && eventType === 'meeting' && !selectedEvent && user?.id) {
      calculateBestTimeSuggestions()
    }
  }, [showCreateModal, eventType, selectedEvent, user?.id])

  const handleAcceptInvite = () => {
    if (!selectedEvent || !user?.id) return

    const updatedEvent: Event = {
      ...selectedEvent,
      inviteStatus: 'accepted',
      updatedAt: nowISO()
    }

    setEvents(events.map(e => e.id === selectedEvent.id ? updatedEvent : e))
    setSelectedEvent(updatedEvent)
    setToast({ message: 'Invitation accepted', type: 'success' })
    
    // Update in localStorage
    const allEvents = getJSON<Event[]>(EVENTS_KEY, []) || []
    const updatedEvents = allEvents.map(e => e.id === selectedEvent.id ? updatedEvent : e)
    setJSON(EVENTS_KEY, updatedEvents)
  }

  const handleDeclineInvite = () => {
    if (!selectedEvent || !user?.id) return

    const updatedEvent: Event = {
      ...selectedEvent,
      inviteStatus: 'declined',
      updatedAt: nowISO()
    }

    setEvents(events.map(e => e.id === selectedEvent.id ? updatedEvent : e))
    setSelectedEvent(updatedEvent)
    setToast({ message: 'Invitation declined', type: 'info' })
    
    // Update in localStorage
    const allEvents = getJSON<Event[]>(EVENTS_KEY, []) || []
    const updatedEvents = allEvents.map(e => e.id === selectedEvent.id ? updatedEvent : e)
    setJSON(EVENTS_KEY, updatedEvents)
  }

  // Helper to get softer border color for light theme
  const getBorderColor = (color: string, isDark: boolean): string => {
    if (isDark) return color
    // For light theme, use a lighter/softer version
    // Convert hex to rgba with reduced opacity for softer look
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    return `rgba(${r}, ${g}, ${b}, 0.5)`
  }

  // Check if an event is finished (past date and time)
  const isEventFinished = (event: Event): boolean => {
    const now = new Date()
    const eventDate = event.date instanceof Date ? event.date : new Date(event.date)
    
    // Check if date is in the past
    const eventDateOnly = new Date(eventDate)
    eventDateOnly.setHours(0, 0, 0, 0)
    const todayOnly = new Date(now)
    todayOnly.setHours(0, 0, 0, 0)
    
    if (eventDateOnly < todayOnly) {
      return true // Event date is in the past
    }
    
    // If event is today, check if end time has passed
    if (eventDateOnly.getTime() === todayOnly.getTime()) {
      const toTime = event.to || event.time.split(' - ')[1] || '10:00'
      const [toHour, toMinute] = toTime.split(':').map(Number)
      const eventEndTime = new Date(now)
      eventEndTime.setHours(toHour, toMinute, 0, 0)
      
      return eventEndTime < now
    }
    
    return false
  }

  // Convert time string to minutes (e.g., "09:00" -> 540)
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  // Check if two events overlap
  const eventsOverlap = (event1: Event, event2: Event): boolean => {
    const time1 = event1.from || event1.time.split(' - ')[0] || '09:00'
    const time2 = event1.to || event1.time.split(' - ')[1] || '10:00'
    const time3 = event2.from || event2.time.split(' - ')[0] || '09:00'
    const time4 = event2.to || event2.time.split(' - ')[1] || '10:00'
    
    const start1 = timeToMinutes(time1)
    const end1 = timeToMinutes(time2)
    const start2 = timeToMinutes(time3)
    const end2 = timeToMinutes(time4)
    
    // Events overlap if one starts before the other ends
    return (start1 < end2 && end1 > start2)
  }

  // Organize overlapping events into columns
  const organizeOverlappingEvents = (events: Event[]): Array<Event & { column: number; totalColumns: number }> => {
    if (events.length === 0) return []
    
    const organized: Array<Event & { column: number; totalColumns: number }> = []
    const columns: Event[][] = []
    
    events.forEach(event => {
      let placed = false
      
      // Try to place event in existing column
      for (let i = 0; i < columns.length; i++) {
        const columnEvents = columns[i]
        const hasOverlap = columnEvents.some(e => eventsOverlap(e, event))
        
        if (!hasOverlap) {
          columnEvents.push(event)
          organized.push({ ...event, column: i, totalColumns: columns.length })
          placed = true
          break
        }
      }
      
      // If couldn't place, create new column
      if (!placed) {
        columns.push([event])
        organized.push({ ...event, column: columns.length - 1, totalColumns: columns.length })
      }
    })
    
    // Update totalColumns for all events
    return organized.map(e => ({ ...e, totalColumns: columns.length }))
  }

  const getEventsForDate = (date: Date) => {
    return events.filter((e) => {
      const eventDate = e.date instanceof Date ? e.date : new Date(e.date)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  // Get days for month view - fixed to 5 rows (35 days)
  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: Date[] = []
    
    // Add days from previous month
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate()
    
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(prevYear, prevMonth, prevMonthLastDay - i))
    }
    
    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    // Add days from next month to fill exactly 5 rows (35 days total)
    const totalDays = days.length
    const remainingDays = 35 - totalDays
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(nextYear, nextMonth, day))
    }
    
    return days
  }

  // Check if a date belongs to a different month than currentDate
  const isOutsideMonth = (date: Date) => {
    return date.getMonth() !== currentDate.getMonth() || 
           date.getFullYear() !== currentDate.getFullYear()
  }

  // Format date label for outside month days (e.g., "Nov 30")
  const formatOutsideMonthLabel = (date: Date) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[date.getMonth()]} ${date.getDate()}`
  }

  // Get days for week view
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day
    startOfWeek.setDate(diff)
    
    const weekDays: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      weekDays.push(date)
    }
    return weekDays
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    setCurrentDate(newDate)
  }

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
    setSelectedDate(newDate)
  }

  const selectedDateEvents = getEventsForDate(selectedDate)
  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthDays = getMonthDays()
  const weekDaysList = getWeekDays()

  return (
    <div className="page-content">
      <div className="page-container">
        <div className="page-header">
          <div className="flex items-center justify-between">
            <h1 className="page-title">Calendar</h1>
            {isAdmin && (
              <div className="relative" ref={newDropdownRef}>
                <button
                  onClick={() => setShowNewDropdown(!showNewDropdown)}
                  className="btn-primary flex items-center gap-2"
                >
                  <FaPlus /> New
                  <FaChevronDown className="text-xs" />
                </button>
                
                {showNewDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
                    <button
                      onClick={handleCreateMeeting}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-xl"
                    >
                      <FaUsers className="text-blue-600 dark:text-blue-400" />
                      <span className="text-gray-900 dark:text-white">Meeting</span>
                    </button>
                    <button
                      onClick={handleCreateEvent}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-xl"
                    >
                      <FaCalendarAlt className="text-green-600 dark:text-green-400" />
                      <span className="text-gray-900 dark:text-white">Event</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode('month')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              viewMode === 'month'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              viewMode === 'week'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              viewMode === 'day'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Day
          </button>
        </div>

        <div>
          {/* Calendar View */}
          <div className="card">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (viewMode === 'month') navigateMonth('prev')
                    else if (viewMode === 'week') navigateWeek('prev')
                    else navigateDay('prev')
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all"
                >
                  ←
                </button>
                <button
                  onClick={() => {
                    setCurrentDate(new Date())
                    setSelectedDate(new Date())
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    if (viewMode === 'month') navigateMonth('next')
                    else if (viewMode === 'week') navigateWeek('next')
                    else navigateDay('next')
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all"
                >
                  →
                </button>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {viewMode === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                {viewMode === 'week' && `Week of ${weekDaysList[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                {viewMode === 'day' && selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
            </div>

            {/* Month View - Fixed 5 rows (35 days) */}
            {viewMode === 'month' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr>
                      {weekDays.map(day => (
                        <th key={day} className="p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700" style={{ width: '14.28%' }}>
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, weekIndex) => (
                      <tr key={weekIndex} style={{ height: '120px' }}>
                        {weekDays.map((_, dayIndex) => {
                          const dayIndexInMonth = weekIndex * 7 + dayIndex
                          const date = monthDays[dayIndexInMonth]
                          const dayEvents = date ? getEventsForDate(date) : []
                          const isOutside = date ? isOutsideMonth(date) : false
                          
                          return (
                            <td
                              key={dayIndex}
                              onClick={() => date && !isDateDisabled(date) && handleDateClick(date)}
                              className={`p-1.5 border border-gray-200 dark:border-gray-700 align-top relative overflow-hidden ${
                                isOutside ? 'opacity-50 bg-gray-50 dark:bg-gray-900/30' : ''
                              } ${
                                date && !isOutside && isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              } ${
                                date && selectedDate.getTime() === date.getTime() ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                              } ${
                                date && isDateDisabled(date) && !isOutside ? 'bg-gray-100 dark:bg-gray-800/50 cursor-not-allowed' : ''
                              } ${
                                date && !isDateDisabled(date) && !isOutside ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''
                              }`}
                              style={{ height: '120px', width: '14.28%', verticalAlign: 'top' }}
                              title={
                                date ? (
                                  isPastDate(date) 
                                    ? 'Cannot create meetings in the past' 
                                    : isWeekend(date) 
                                    ? 'Fridays and Saturdays are off days' 
                                    : 'Click to view or add meetings'
                                ) : ''
                              }
                            >
                              {date && (
                                <>
                                  {/* Outside month label */}
                                  {isOutside && (
                                    <div className="absolute top-1 right-1 text-xs text-gray-500 dark:text-gray-400 font-medium z-10">
                                      {formatOutsideMonthLabel(date)}
                                    </div>
                                  )}
                                  <div
                                    className={`absolute top-1 left-1.5 text-left z-10 pointer-events-none ${
                                      isDateDisabled(date)
                                        ? 'text-gray-400 dark:text-gray-600 opacity-50'
                                        : isToday(date) && !isOutside
                                        ? 'font-bold text-blue-600 dark:text-blue-400'
                                        : isOutside
                                        ? 'text-gray-500 dark:text-gray-500'
                                        : 'text-gray-900 dark:text-white'
                                    }`}
                                    style={{ fontSize: '14px' }}
                                  >
                                    {date.getDate()}
                                  </div>
                                </>
                              )}
                              {date && dayEvents.length > 0 && (
                                <div 
                                  className="absolute top-7 left-1 right-1 bottom-1 overflow-hidden pointer-events-none"
                                >
                                  <div className="grid grid-cols-3 gap-0.5 h-full">
                                    {dayEvents.slice(0, 9).map((event) => {
                                      const eventColor = (event as any).color || '#3B82F6'
                                      const finished = isEventFinished(event)
                                      // Truncate name to fit in small square (max 4-5 chars)
                                      const shortName = event.title.length > 4 
                                        ? event.title.substring(0, 4) + '...' 
                                        : event.title
                                      
                                      return (
                                        <div
                                          key={event.id}
                                          className={`aspect-square rounded flex items-center justify-center text-center p-0.5 ${
                                            isOutside ? 'opacity-60' : ''
                                          }`}
                                          style={{
                                            backgroundColor: `${eventColor}20`,
                                            color: eventColor,
                                            border: `1.5px solid ${getBorderColor(eventColor, isDark)}`,
                                            textDecoration: finished ? 'line-through' : 'none',
                                            opacity: finished ? (isOutside ? 0.4 : 0.6) : (isOutside ? 0.6 : 1),
                                            fontSize: '9px',
                                            fontWeight: '600',
                                            minWidth: '0',
                                            minHeight: '0'
                                          }}
                                          title={event.title}
                                        >
                                          <span className="truncate w-full leading-tight">{shortName}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                  {dayEvents.length > 9 && (
                                    <div className={`absolute bottom-0 left-0 right-0 text-center text-[9px] px-1 py-0.5 ${isOutside ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500 dark:text-gray-500'}`} style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(2px)' }}>
                                      +{dayEvents.length - 9} more
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Week View */}
            {viewMode === 'week' && (
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  {/* Header with day names */}
                  <div className="grid grid-cols-8 border-b-2 border-gray-300 dark:border-gray-600">
                    <div className="p-3 border-r border-gray-200 dark:border-gray-700"></div>
                    {weekDaysList.map((date, index) => (
                      <button
                        key={index}
                        onClick={() => handleDateClick(date)}
                        disabled={isDateDisabled(date)}
                        className={`p-3 text-center border-r border-gray-200 dark:border-gray-700 transition-colors ${
                          isDateDisabled(date)
                            ? 'bg-gray-100 dark:bg-gray-800/50 opacity-50 cursor-not-allowed'
                            : isToday(date)
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        } ${
                          selectedDate.getTime() === date.getTime() ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                        }`}
                        title={
                          isPastDate(date) 
                            ? 'Cannot create meetings in the past' 
                            : isWeekend(date) 
                            ? 'Fridays and Saturdays are off days' 
                            : ''
                        }
                      >
                        <div className={`text-xs font-medium mb-1 ${
                          isToday(date)
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {weekDays[index]}
                        </div>
                        <div className={`text-lg font-semibold ${
                          isToday(date)
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {date.getDate()}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* All-day row */}
                  <div className="grid grid-cols-8 border-b-2 border-gray-300 dark:border-gray-600">
                    <div className="p-2 border-r border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 font-medium">
                      All-day
                    </div>
                    {weekDaysList.map((date, dayIndex) => {
                      const allDayEvents = getEventsForDate(date).filter(event => {
                        const fromTime = event.from || event.time.split(' - ')[0] || '00:00'
                        return fromTime === '00:00' || !event.from
                      })
                      
                      return (
                        <div
                          key={dayIndex}
                          className="relative border-r border-gray-200 dark:border-gray-700 p-1 min-h-[40px]"
                        >
                          {allDayEvents.length > 0 && (
                            <div className="space-y-1">
                              {allDayEvents.map(event => {
                                const eventColor = (event as any).color || '#3B82F6'
                                const finished = isEventFinished(event)
                                return (
                                  <button
                                    key={event.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEventClick(event)
                                    }}
                                    className="w-full rounded text-left p-1.5 hover:opacity-90 transition-opacity"
                                    style={{
                                      backgroundColor: `${eventColor}15`,
                                      color: eventColor,
                                      borderLeft: `3px solid ${getBorderColor(eventColor, isDark)}`,
                                      textDecoration: finished ? 'line-through' : 'none',
                                      opacity: finished ? 0.6 : 1,
                                      fontSize: '11px',
                                      fontWeight: '500'
                                    }}
                                  >
                                    {event.title}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Time slots */}
                  <div className="relative">
                    {Array.from({ length: 16 }).map((_, hourIndex) => {
                      const hour = hourIndex + 9 // Start from 9 AM (09:00)
                      const hourStart = hour
                      const hourEnd = hour + 1
                      
                      return (
                        <div key={hour} className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700" style={{ minHeight: '60px' }}>
                          {/* Time label */}
                          <div className="p-2 border-r border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 font-medium">
                            {hourStart.toString().padStart(2, '0')}:00
                          </div>
                          
                          {/* Day columns */}
                          {weekDaysList.map((date, dayIndex) => {
                            const dayEvents = getEventsForDate(date).filter(event => {
                              const fromTime = event.from || event.time.split(' - ')[0] || '09:00'
                              const toTime = event.to || event.time.split(' - ')[1] || '10:00'
                              const [fromHour, fromMin] = fromTime.split(':').map(Number)
                              const [toHour, toMin] = toTime.split(':').map(Number)
                              
                              // Skip all-day events
                              if (fromHour === 0 && fromMin === 0 && !event.from) return false
                              
                              const eventStart = fromHour + fromMin / 60
                              const eventEnd = toHour + toMin / 60
                              
                              // Check if event overlaps with this hour slot
                              return eventStart < hourEnd && eventEnd > hourStart
                            })
                            
                            const organizedEvents = organizeOverlappingEvents(dayEvents)
                            
                            return (
                              <div
                                key={dayIndex}
                                className="relative border-r border-gray-200 dark:border-gray-700 p-1"
                                style={{ minHeight: '60px' }}
                              >
                                {organizedEvents.map((event, eventIndex) => {
                                  const eventColor = (event as any).color || '#3B82F6'
                                  const finished = isEventFinished(event)
                                  const fromTime = event.from || event.time.split(' - ')[0] || '09:00'
                                  const toTime = event.to || event.time.split(' - ')[1] || '10:00'
                                  const [fromHour, fromMin] = fromTime.split(':').map(Number)
                                  const [toHour, toMin] = toTime.split(':').map(Number)
                                  
                                  const eventStart = fromHour + fromMin / 60
                                  const eventEnd = toHour + toMin / 60
                                  
                                  // Calculate position and height
                                  const topPercent = Math.max(0, (eventStart - hourStart) / (hourEnd - hourStart)) * 100
                                  const heightPercent = Math.min(100, (eventEnd - eventStart) / (hourEnd - hourStart)) * 100
                                  
                                  const width = event.totalColumns > 1 ? `${100 / event.totalColumns}%` : '100%'
                                  const left = event.totalColumns > 1 ? `${(event.column / event.totalColumns) * 100}%` : '0'
                                  
                                  return (
                                    <button
                                      key={event.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEventClick(event)
                                      }}
                                      className="absolute rounded text-left p-1.5 hover:opacity-90 transition-opacity text-xs"
                                      style={{
                                        backgroundColor: `${eventColor}15`,
                                        color: eventColor,
                                        borderLeft: `3px solid ${getBorderColor(eventColor, isDark)}`,
                                        top: `${topPercent}%`,
                                        height: `${heightPercent}%`,
                                        width: width,
                                        left: left,
                                        textDecoration: finished ? 'line-through' : 'none',
                                        opacity: finished ? 0.6 : 1,
                                        fontSize: '12px',
                                        lineHeight: '1.4',
                                        fontWeight: '500'
                                      }}
                                    >
                                      <div className={`font-semibold truncate ${finished ? 'line-through' : ''}`} style={{ fontSize: '11px' }}>
                                        {event.title}
                                      </div>
                                      <div className="opacity-75" style={{ fontSize: '10px' }}>
                                        {fromTime} - {toTime}
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Day View */}
            {viewMode === 'day' && (
              <div className="space-y-4">
                <div className="text-center p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {selectedDate.getDate()}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const hourEvents = selectedDateEvents.filter(event => {
                      const fromTime = event.from || event.time.split(' - ')[0] || '09:00'
                      const eventHour = parseInt(fromTime.split(':')[0])
                      return eventHour === hour
                    })
                    const organizedEvents = organizeOverlappingEvents(hourEvents)
                    
                    return (
                      <div key={hour} className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                        <div className="w-16 text-sm text-gray-600 dark:text-gray-400 font-semibold">
                          {hour.toString().padStart(2, '0')}:00
                        </div>
                        <div className="flex-1 relative">
                          {organizedEvents.map(event => {
                            const eventColor = (event as any).color || '#3B82F6'
                            const finished = isEventFinished(event)
                            const width = `${100 / event.totalColumns}%`
                            const left = `${(event.column / event.totalColumns) * 100}%`
                            
                            return (
                              <button
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className="mb-2 p-3 rounded-lg hover:opacity-80 text-left transition-opacity"
                                style={{
                                  backgroundColor: `${eventColor}20`,
                                  color: eventColor,
                                  borderLeft: `4px solid ${getBorderColor(eventColor, isDark)}`,
                                  width: event.totalColumns > 1 ? width : '100%',
                                  left: event.totalColumns > 1 ? left : '0',
                                  position: event.totalColumns > 1 ? 'absolute' : 'relative',
                                  textDecoration: finished ? 'line-through' : 'none',
                                  opacity: finished ? 0.6 : 1
                                }}
                              >
                                <div className={`font-semibold ${finished ? 'line-through' : ''}`}>{event.title}</div>
                                <div className="text-sm opacity-75">{event.time}</div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Event Modal */}
        {isAdmin && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false)
              setIsDateLocked(false)
              setNewEvent({
                title: '',
                description: '',
                date: formatDateLocal(new Date()),
                from: '09:00',
                to: '10:00',
                location: '',
                showAs: 'busy',
                sharedWith: [],
                color: '#3B82F6',
                isOnline: false,
                meetingLink: '',
                isRecurring: false,
                recurrenceType: 'none'
              })
              setInvitedUsers([])
              setInvitedGroup('')
              if (selectedEvent) setSelectedEvent(null)
            }}
            title={selectedEvent ? `Edit ${eventType === 'meeting' ? 'Meeting' : 'Event'}` : `Add New ${eventType === 'meeting' ? 'Meeting' : 'Event'}`}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {eventType === 'meeting' ? 'Meeting Name' : 'Event Name'} *
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder={`Enter ${eventType === 'meeting' ? 'meeting' : 'event'} name`}
                  required
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { name: 'Blue', value: '#3B82F6' },
                    { name: 'Green', value: '#10B981' },
                    { name: 'Purple', value: '#8B5CF6' },
                    { name: 'Red', value: '#EF4444' },
                    { name: 'Orange', value: '#F59E0B' },
                    { name: 'Pink', value: '#EC4899' },
                    { name: 'Teal', value: '#14B8A6' },
                    { name: 'Yellow', value: '#EAB308' }
                  ].map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewEvent({ ...newEvent, color: color.value })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        newEvent.color === color.value
                          ? 'border-blue-600 dark:border-blue-400 ring-2 ring-blue-500 scale-110'
                          : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Online Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Online
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enable online meeting link
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewEvent({ ...newEvent, isOnline: !newEvent.isOnline, meetingLink: !newEvent.isOnline ? '' : newEvent.meetingLink })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    newEvent.isOnline ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      newEvent.isOnline ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Best Time Suggestions */}
              {eventType === 'meeting' && !selectedEvent && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FaCalendarCheck className="text-green-600 dark:text-green-400 text-lg" />
                      <h4 className="font-bold text-gray-900 dark:text-white">Best Time Suggestions</h4>
                    </div>
                    <button
                      type="button"
                      onClick={calculateBestTimeSuggestions}
                      disabled={bestTimeLoading}
                      className="text-xs text-green-600 dark:text-green-400 hover:underline disabled:opacity-50"
                    >
                      {bestTimeLoading ? 'Calculating...' : 'Refresh'}
                    </button>
                  </div>
                  
                  {bestTimeLoading ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      <span className="text-sm">Analyzing your schedule...</span>
                    </div>
                  ) : bestTimeSuggestions.length > 0 ? (
                    <div className="space-y-2">
                      {bestTimeSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            // Validate date is not in the past before applying
                            const suggestionDate = new Date(suggestion.date)
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            suggestionDate.setHours(0, 0, 0, 0)
                            
                            if (suggestionDate < today) {
                              setToast({ 
                                message: 'Cannot select past dates. Please choose a future date.', 
                                type: 'error' 
                              })
                              return
                            }
                            
                            const [from, to] = suggestion.time.split(' - ')
                            setNewEvent({
                              ...newEvent,
                              date: suggestion.date,
                              from: from,
                              to: to
                            })
                          }}
                          className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 border-2 border-green-300 dark:border-green-700 rounded-lg hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                {(() => {
                                  const suggestionDate = new Date(suggestion.date)
                                  const today = new Date()
                                  today.setHours(0, 0, 0, 0)
                                  suggestionDate.setHours(0, 0, 0, 0)
                                  
                                  // Validate date is not in the past
                                  if (suggestionDate < today) {
                                    return 'Invalid date (past)'
                                  }
                                  
                                  return suggestionDate.toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: suggestionDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
                                  })
                                })()}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {suggestion.time}
                              </div>
                            </div>
                            <div className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full font-semibold">
                              Best
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                      No available time slots found. Try selecting a different date range.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    From *
                  </label>
                  <input
                    type="time"
                    value={newEvent.from}
                    onChange={(e) => {
                      const selectedDate = new Date(newEvent.date)
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      
                      // If date is today, validate time is not in the past
                      if (selectedDate.toDateString() === today.toDateString()) {
                        const now = new Date()
                        const [hour, minute] = e.target.value.split(':').map(Number)
                        const selectedTime = new Date(now)
                        selectedTime.setHours(hour, minute, 0, 0)
                        
                        if (selectedTime < now) {
                          setToast({ message: 'Cannot select past times for today', type: 'warning' })
                          return
                        }
                      }
                      setNewEvent({ ...newEvent, from: e.target.value })
                    }}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    To *
                  </label>
                  <input
                    type="time"
                    value={newEvent.to}
                    onChange={(e) => {
                      // Validate "to" time is after "from" time
                      if (e.target.value <= newEvent.from) {
                        setToast({ message: 'End time must be after start time', type: 'warning' })
                        return
                      }
                      setNewEvent({ ...newEvent, to: e.target.value })
                    }}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                    min={newEvent.from}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value)
                    // Check if selected date is in the past
                    if (isPastDate(selectedDate)) {
                      setToast({ message: 'Cannot create meetings in the past. Please select today or a future date.', type: 'warning' })
                      return
                    }
                    // Check if selected date is Friday or Saturday
                    if (isWeekend(selectedDate)) {
                      setToast({ message: 'Fridays and Saturdays are off days. Please select a different date.', type: 'warning' })
                      return
                    }
                    setNewEvent({ ...newEvent, date: e.target.value })
                  }}
                  disabled={isDateLocked}
                  min={formatDateLocal(new Date())}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                    isDateLocked
                      ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isDateLocked 
                    ? 'Date is locked to the selected day. Use the +New button to create meetings for different dates.'
                    : 'Only today and future dates are available. Fridays and Saturdays are off days.'}
                </p>
              </div>

              {/* Existing Meetings for Selected Date */}
              {(() => {
                const selectedDateObj = new Date(newEvent.date)
                const existingMeetings = getEventsForDate(selectedDateObj)
                  .filter(e => !selectedEvent || e.id !== selectedEvent.id) // Exclude the event being edited
                  .sort((a, b) => {
                    const timeA = a.from || a.time.split(' - ')[0] || '00:00'
                    const timeB = b.from || b.time.split(' - ')[0] || '00:00'
                    return timeA.localeCompare(timeB)
                  })

                // Check for time conflicts
                const hasConflict = existingMeetings.some(meeting => {
                  const meetingFrom = meeting.from || meeting.time.split(' - ')[0] || '00:00'
                  const meetingTo = meeting.to || meeting.time.split(' - ')[1] || '23:59'
                  const newFrom = newEvent.from
                  const newTo = newEvent.to
                  
                  // Check if times overlap
                  return (newFrom < meetingTo && newTo > meetingFrom)
                })

                if (existingMeetings.length > 0) {
                  return (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-3">
                        <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                          Existing Meetings for {selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h4>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {existingMeetings.map((meeting) => {
                          const meetingColor = (meeting as any).color || '#3B82F6'
                          const meetingFrom = meeting.from || meeting.time.split(' - ')[0] || '00:00'
                          const meetingTo = meeting.to || meeting.time.split(' - ')[1] || '23:59'
                          
                          // Check if this meeting conflicts with the new time
                          const conflicts = newEvent.from && newEvent.to && 
                            (newEvent.from < meetingTo && newEvent.to > meetingFrom)
                          
                          return (
                            <div
                              key={meeting.id}
                              className={`p-3 rounded-lg border-2 ${
                                conflicts
                                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                                    {meeting.title}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                    <FaClock className="text-blue-600 dark:text-blue-400" />
                                    <span>{meetingFrom} - {meetingTo}</span>
                                  </div>
                                  {meeting.location && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 mt-1">
                                      <FaMapMarkerAlt />
                                      <span>{meeting.location}</span>
                                    </div>
                                  )}
                                </div>
                                <div
                                  className="w-4 h-4 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: meetingColor }}
                                  title={`Color: ${meetingColor}`}
                                />
                              </div>
                              {conflicts && (
                                <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                  <FaExclamationTriangle /> Time conflict!
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {hasConflict && (
                        <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                          <p className="text-xs text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                            <FaExclamationTriangle /> Warning: Your selected time conflicts with an existing meeting. Please choose a different time.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              })()}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Enter location (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>

              {/* Invite Users */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <FaUsers className="inline mr-2" />
                  Invite Users
                </label>
                <div className="relative mb-2">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    value={inviteUserSearch}
                    onChange={(e) => setInviteUserSearch(e.target.value)}
                    placeholder="Search users…"
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                </div>
                {filteredUsersForInvite.length > 0 && (
                  <div className="max-h-32 overflow-y-auto border-2 border-gray-200 dark:border-gray-700 rounded-lg mb-2">
                    {filteredUsersForInvite.map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          if (!invitedUsers.includes(user.id)) {
                            setInvitedUsers([...invitedUsers, user.id])
                            setInviteUserSearch('')
                          }
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <FaUsers className="text-blue-600 dark:text-blue-400 text-sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        </div>
                        <FaPlus className="text-blue-600 dark:text-blue-400 text-xs" />
                      </button>
                    ))}
                  </div>
                )}
                {invitedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {invitedUsers.map(userId => {
                      const user = allUsers.find(u => u.id === userId)
                      if (!user) return null
                      return (
                        <span
                          key={userId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs"
                        >
                          {user.name}
                          <button
                            type="button"
                            onClick={() => setInvitedUsers(invitedUsers.filter(id => id !== userId))}
                            className="hover:text-blue-900 dark:hover:text-blue-100"
                          >
                            <FaTimes className="text-xs" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Invite Group */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <FaUserFriends className="inline mr-2" />
                  Invite Group
                </label>
                <select
                  value={invitedGroup}
                  onChange={(e) => setInvitedGroup(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">Select a group (optional)</option>
                  {allRooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recurring Options */}
              <div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Recurring
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Repeat this event
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewEvent({ 
                      ...newEvent, 
                      isRecurring: !newEvent.isRecurring,
                      recurrenceType: !newEvent.isRecurring ? 'none' : newEvent.recurrenceType
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      newEvent.isRecurring ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        newEvent.isRecurring ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {newEvent.isRecurring && (
                  <select
                    value={newEvent.recurrenceType}
                    onChange={(e) => setNewEvent({ ...newEvent, recurrenceType: e.target.value as 'none' | 'daily' | 'weekly' | 'monthly' })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewEvent({
                      title: '',
                      description: '',
                      date: formatDateLocal(new Date()),
                      from: '09:00',
                      to: '10:00',
                      location: '',
                      showAs: 'busy',
                      sharedWith: [],
                      color: '#3B82F6',
                      isOnline: false,
                      meetingLink: '',
                      isRecurring: false,
                      recurrenceType: 'none'
                    })
                    setInvitedUsers([])
                    setInvitedGroup('')
                    if (selectedEvent) setSelectedEvent(null)
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={selectedEvent ? handleUpdateEvent : handleSaveEvent}
                  className="btn-primary flex-1"
                >
                  {selectedEvent ? `Update ${eventType === 'meeting' ? 'Meeting' : 'Event'}` : `Create ${eventType === 'meeting' ? 'Meeting' : 'Event'}`}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Day Events Modal */}
        <Modal
          isOpen={showDayEventsModal}
          onClose={() => {
            setShowDayEventsModal(false)
          }}
          title={`Events for ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`}
          size="lg"
        >
          {selectedDateEvents.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No events for this day
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDateEvents
                .sort((a, b) => {
                  const timeA = a.from || a.time.split(' - ')[0] || '00:00'
                  const timeB = b.from || b.time.split(' - ')[0] || '00:00'
                  return timeA.localeCompare(timeB)
                })
                .map((event) => {
                  const eventColor = (event as any).color || '#3B82F6'
                  const finished = isEventFinished(event)
                  return (
                    <button
                      key={event.id}
                      onClick={() => {
                        setShowDayEventsModal(false)
                        handleEventClick(event)
                      }}
                      className="w-full text-left p-4 rounded-lg border-2 hover:opacity-90 transition-all"
                      style={{
                        backgroundColor: `${eventColor}10`,
                        borderColor: `${eventColor}40`,
                        opacity: finished ? 0.6 : 1
                      }}
                    >
                      <h4 className={`font-semibold mb-2 ${finished ? 'line-through' : ''}`} style={{ color: eventColor, fontSize: '16px' }}>
                        {event.title}
                      </h4>
                      {event.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{event.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <FaClock /> {event.time}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <FaMapMarkerAlt /> {event.location}
                        </div>
                      )}
                    </button>
                  )
                })}
            </div>
          )}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowDayEventsModal(false)
                  setEventType('event')
                  setNewEvent({
                    title: '',
                    description: '',
                    date: formatDateLocal(selectedDate),
                    from: '09:00',
                    to: '10:00',
                    location: '',
                    showAs: 'busy',
                    sharedWith: [],
                    color: '#3B82F6',
                    isOnline: false,
                    meetingLink: '',
                    isRecurring: false,
                    recurrenceType: 'none'
                  })
                  setInvitedUsers([])
                  setInvitedGroup('')
                  setIsDateLocked(true) // Lock date when adding event to specific day
                  setShowCreateModal(true)
                }}
                className="w-full btn-primary"
              >
                <FaPlus className="inline mr-2" /> Add Event to This Day
              </button>
            </div>
          )}
        </Modal>

        {/* Event Details Modal */}
        <Modal
          isOpen={showEventDetailsModal}
          onClose={() => {
            setShowEventDetailsModal(false)
            setSelectedEvent(null)
          }}
          title={selectedEvent ? (
            ((selectedEvent as any)?.type || ((selectedEvent as any)?.isOnline || (selectedEvent as any)?.meetingLink ? 'meeting' : 'event')) === 'meeting' 
              ? 'Meeting Details' 
              : 'Event Details'
          ) : 'Event Details'}
        >
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedEvent.title}
                </h3>
                {selectedEvent.description && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {selectedEvent.description}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />
                  <span>
                    {selectedEvent.date instanceof Date 
                      ? selectedEvent.date.toLocaleDateString()
                      : new Date(selectedEvent.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <FaClock className="text-blue-600 dark:text-blue-400" />
                  <span>{selectedEvent.time}</span>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <FaMapMarkerAlt className="text-blue-600 dark:text-blue-400" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {/* Accept/Decline buttons for pending invites */}
                {selectedEvent.isInvite === true && 
                 selectedEvent.inviteStatus === 'pending' && 
                 selectedEvent.recurrenceType !== 'daily' && (
                  <>
                    <button
                      onClick={handleAcceptInvite}
                      className="btn-primary flex-1"
                    >
                      <FaCheck /> Accept Invite
                    </button>
                    <button
                      onClick={handleDeclineInvite}
                      className="btn-secondary flex-1"
                    >
                      <FaTimesCircle /> Decline
                    </button>
                  </>
                )}

                {/* Edit/Delete buttons - only for creator */}
                {selectedEvent.creatorId === user?.id && isAdmin && (
                  <>
                    {/* Show Edit/Delete when: not an invite, or already accepted/declined, or daily recurring */}
                    {(!selectedEvent.isInvite || 
                      (selectedEvent.inviteStatus !== 'pending' && selectedEvent.inviteStatus !== undefined) || 
                      selectedEvent.recurrenceType === 'daily') && (
                      <>
                        <button
                          onClick={handleEditEvent}
                          className="btn-secondary flex-1"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this event?')) {
                              handleDeleteEvent(selectedEvent.id)
                            }
                          }}
                          className="btn-danger flex-1"
                        >
                          <FaTrash /> Delete
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Day Events Bar */}
        {showDayEventsBar && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
              onClick={() => setShowDayEventsBar(false)}
            />
            {/* Side Bar */}
            <div className="fixed right-0 top-0 h-full w-96 bg-gray-50 dark:bg-gray-800 border-l-2 border-gray-200 dark:border-gray-700 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button
                onClick={() => setShowDayEventsBar(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                aria-label="Close"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>
            
            {/* Events List */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedDateEvents.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No events for this day
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents
                    .sort((a, b) => {
                      const timeA = a.from || a.time.split(' - ')[0] || '00:00'
                      const timeB = b.from || b.time.split(' - ')[0] || '00:00'
                      return timeA.localeCompare(timeB)
                    })
                    .map((event) => {
                      const eventColor = (event as any).color || '#3B82F6'
                      const finished = isEventFinished(event)
                      return (
                        <button
                          key={event.id}
                          onClick={() => {
                            setShowDayEventsBar(false)
                            handleEventClick(event)
                          }}
                          className="w-full text-left p-4 rounded-lg border-2 hover:opacity-90 transition-all"
                          style={{
                            backgroundColor: `${eventColor}10`,
                            borderColor: `${eventColor}40`,
                            opacity: finished ? 0.6 : 1
                          }}
                        >
                          <h4 className={`font-semibold mb-2 ${finished ? 'line-through' : ''}`} style={{ color: eventColor, fontSize: '16px' }}>
                            {event.title}
                          </h4>
                          {event.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{event.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                            <FaClock /> {event.time}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <FaMapMarkerAlt /> {event.location}
                            </div>
                          )}
                        </button>
                      )
                    })}
                </div>
              )}
            </div>
            
            {/* Footer - Add Event Button */}
            {isAdmin && !isPastDate(selectedDate) && !isWeekend(selectedDate) && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setEventType('event')
                    setNewEvent({
                      title: '',
                      description: '',
                      date: formatDateLocal(selectedDate),
                      from: '09:00',
                      to: '10:00',
                      location: '',
                      showAs: 'busy',
                      sharedWith: [],
                      color: '#3B82F6',
                      isOnline: false,
                      meetingLink: '',
                      isRecurring: false,
                      recurrenceType: 'none'
                    })
                    setInvitedUsers([])
                    setInvitedGroup('')
                    setIsDateLocked(true) // Lock date when adding event to specific day
                    setShowCreateModal(true)
                    // Keep sidebar open so user can see the new event after creating
                  }}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  <FaPlus /> Add Event
                </button>
              </div>
            )}
            {isAdmin && (isPastDate(selectedDate) || isWeekend(selectedDate)) && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {isPastDate(selectedDate) 
                    ? 'Cannot add meetings to past dates'
                    : 'Fridays and Saturdays are off days'}
                </p>
              </div>
            )}
            </div>
          </>
        )}

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  )
}

export default Calendar
