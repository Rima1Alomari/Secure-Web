import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaPlus, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaEdit, FaTrash, FaTimes, FaVideo, FaChevronDown, FaUsers, FaUserFriends, FaSearch, FaLink, FaCheck, FaTimesCircle, FaCalendarCheck } from 'react-icons/fa'
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
  
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [showNewDropdown, setShowNewDropdown] = useState(false)
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
    date: new Date().toISOString().split('T')[0],
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
    setShowCreateModal(true)
    // Reset form
    setNewEvent({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
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
    setShowCreateModal(true)
    // Reset form
    setNewEvent({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
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
    
    if (selectedDate < today) {
      setToast({ message: 'Cannot create events in the past', type: 'error' })
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

    // Auto-generate meeting link if online and not provided
    let meetingLink = newEvent.meetingLink
    if (newEvent.isOnline && !meetingLink) {
      meetingLink = `https://meet.secure-web.com/${uuid().substring(0, 8)}`
    }

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
      date: new Date().toISOString().split('T')[0],
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
    setEvents(events.filter(e => e.id !== eventId))
    setToast({ message: 'Event deleted', type: 'success' })
    setShowEventDetailsModal(false)
    setSelectedEvent(null)
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
        ? selectedEvent.date.toISOString().split('T')[0] 
        : new Date(selectedEvent.date).toISOString().split('T')[0],
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

    // Auto-generate meeting link if online and not provided
    let meetingLink = newEvent.meetingLink
    if (newEvent.isOnline && !meetingLink) {
      meetingLink = `https://meet.secure-web.com/${uuid().substring(0, 8)}`
    }

    const updatedEvent: Event = {
      ...selectedEvent,
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

    setEvents(events.map(e => e.id === selectedEvent.id ? updatedEvent : e))
    setToast({ message: `${eventType === 'meeting' ? 'Meeting' : 'Event'} updated successfully`, type: 'success' })
    setShowCreateModal(false)
    setSelectedEvent(null)
    setNewEvent({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    // Only open create modal for admins
    if (isAdmin) {
      setEventType('event') // Default to event when clicking date
      // Reset form to default state (don't preserve stale values)
      setNewEvent({
        title: '',
        description: '',
        date: date.toISOString().split('T')[0],
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
      setShowCreateModal(true)
    }
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
                date: checkDate.toISOString().split('T')[0],
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
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <div className={`lg:col-span-2 card`}>
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
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {weekDays.map(day => (
                        <th key={day} className="p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, weekIndex) => (
                      <tr key={weekIndex}>
                        {weekDays.map((_, dayIndex) => {
                          const dayIndexInMonth = weekIndex * 7 + dayIndex
                          const date = monthDays[dayIndexInMonth]
                          const dayEvents = date ? getEventsForDate(date) : []
                          const isOutside = date ? isOutsideMonth(date) : false
                          
                          return (
                            <td
                              key={dayIndex}
                              className={`p-1.5 border border-gray-200 dark:border-gray-700 h-[80px] align-top relative ${
                                isOutside ? 'opacity-50 bg-gray-50 dark:bg-gray-900/30' : ''
                              } ${
                                date && !isOutside && isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              } ${
                                date && selectedDate.getTime() === date.getTime() ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                              }`}
                            >
                              {date && (
                                <>
                                  {/* Outside month label */}
                                  {isOutside && (
                                    <div className="absolute top-1 right-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                      {formatOutsideMonthLabel(date)}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => handleDateClick(date)}
                                    className={`w-full text-left mb-1 relative ${
                                      isToday(date) && !isOutside
                                        ? 'font-bold text-blue-600 dark:text-blue-400'
                                        : isOutside
                                        ? 'text-gray-500 dark:text-gray-500'
                                        : 'text-gray-900 dark:text-white'
                                    }`}
                                  >
                                    {date.getDate()}
                                  </button>
                                </>
                              )}
                              {date && dayEvents.length > 0 && (
                                <div className="space-y-0.5">
                                  {dayEvents.slice(0, 2).map(event => {
                                    const eventColor = (event as any).color || '#3B82F6'
                                    return (
                                      <button
                                        key={event.id}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleEventClick(event)
                                        }}
                                        className={`w-full text-[10px] px-1 py-0.5 rounded truncate ${
                                          isOutside ? 'opacity-60' : ''
                                        }`}
                                        style={{
                                          backgroundColor: `${eventColor}20`,
                                          color: eventColor,
                                          borderLeft: `2px solid ${eventColor}`
                                        }}
                                        title={event.title}
                                      >
                                        {event.title}
                                      </button>
                                    )
                                  })}
                                  {dayEvents.length > 2 && (
                                    <div className={`text-[10px] px-1 ${isOutside ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500 dark:text-gray-500'}`}>
                                      +{dayEvents.length - 2}
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
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-2">
                  {weekDaysList.map((date, index) => {
                    const dayEvents = getEventsForDate(date)
                    return (
                      <div
                        key={index}
                        className={`p-3 border-2 rounded-lg min-h-[200px] ${
                          isToday(date)
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        } ${
                          selectedDate.getTime() === date.getTime() ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                        }`}
                      >
                        <button
                          onClick={() => handleDateClick(date)}
                          className={`font-semibold mb-2 ${
                            isToday(date)
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          <div className="text-sm">{weekDays[index]}</div>
                          <div className="text-lg">{date.getDate()}</div>
                        </button>
                        <div className="space-y-1">
                          {dayEvents.map(event => {
                            const eventColor = (event as any).color || '#3B82F6'
                            return (
                              <button
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEventClick(event)
                                }}
                                className="w-full text-xs p-1.5 rounded hover:opacity-80 text-left transition-opacity"
                                style={{
                                  backgroundColor: `${eventColor}20`,
                                  color: eventColor,
                                  borderLeft: `3px solid ${eventColor}`
                                }}
                              >
                                <div className="font-semibold truncate">{event.title}</div>
                                <div className="text-xs opacity-75">{event.time}</div>
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
                    return (
                      <div key={hour} className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                        <div className="w-16 text-sm text-gray-600 dark:text-gray-400 font-semibold">
                          {hour.toString().padStart(2, '0')}:00
                        </div>
                        <div className="flex-1">
                          {hourEvents.map(event => {
                            const eventColor = (event as any).color || '#3B82F6'
                            return (
                              <button
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className="w-full mb-2 p-3 rounded-lg hover:opacity-80 text-left transition-opacity"
                                style={{
                                  backgroundColor: `${eventColor}20`,
                                  color: eventColor,
                                  borderLeft: `4px solid ${eventColor}`
                                }}
                              >
                                <div className="font-semibold">{event.title}</div>
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

          {/* Events Panel */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FaCalendarAlt /> Events
            </h3>
            <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            {selectedDateEvents.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No events for this day
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => {
                  const eventColor = (event as any).color || '#3B82F6'
                  return (
                    <button
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="w-full text-left p-4 rounded-lg border-2 hover:opacity-90 transition-all"
                      style={{
                        backgroundColor: `${eventColor}10`,
                        borderColor: `${eventColor}40`
                      }}
                    >
                      <h4 className="font-semibold mb-2" style={{ color: eventColor }}>{event.title}</h4>
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
        </div>

        {/* Create/Edit Event Modal */}
        {isAdmin && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false)
              setNewEvent({
                title: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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

              {/* Meeting Link (when Online is on) */}
              {newEvent.isOnline && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Meeting Link
                  </label>
                  <div className="relative">
                    <FaLink className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      value={newEvent.meetingLink}
                      onChange={(e) => setNewEvent({ ...newEvent, meetingLink: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="https://meet.secure-web.com/abc123 (auto-generated if empty)"
                    />
                  </div>
                </div>
              )}
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
                          className="w-full text-left p-3 bg-white dark:bg-gray-800 border-2 border-green-300 dark:border-green-700 rounded-lg hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all"
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
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Cannot select past dates
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                      date: new Date().toISOString().split('T')[0],
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
