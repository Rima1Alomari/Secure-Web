import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaPlus, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaEdit, FaTrash, FaTimes, FaVideo, FaRobot, FaSpinner, FaLightbulb } from 'react-icons/fa'
import axios from 'axios'
import { getToken } from '../utils/auth'
import { Modal, Toast, ConfirmDialog } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { EVENTS_KEY } from '../data/keys'
import { EventItem } from '../types/models'
import { useUser } from '../contexts/UserContext'
import { trackMeetingOpened } from '../utils/recentTracker'

type ViewMode = 'month' | 'week' | 'day'

interface Event extends EventItem {
  from?: string
  to?: string
  showAs?: 'busy' | 'free'
  sharedWith?: string[]
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
  
  // AI features state
  const [showAiScheduling, setShowAiScheduling] = useState(false)
  const [aiSchedulingSuggestions, setAiSchedulingSuggestions] = useState<string>('')
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    from: '09:00',
    to: '10:00',
    location: '',
    showAs: 'busy' as 'busy' | 'free',
    sharedWith: [] as string[]
  })

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

  const handleCreateEvent = () => {
    if (!newEvent.title.trim() || !newEvent.from || !newEvent.to) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
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
      sharedWith: newEvent.sharedWith,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    } as any
    
    if (roomId) {
      (event as any).roomId = roomId
      if (!event.description) {
        event.description = `Room: ${roomId}`
      } else if (!event.description.includes(`Room: ${roomId}`)) {
        event.description = `Room: ${roomId}\n${event.description}`
      }
    }

    setEvents([...events, event])
    setToast({ message: 'Event created successfully', type: 'success' })
    setNewEvent({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      from: '09:00',
      to: '10:00',
      location: '',
      showAs: 'busy',
      sharedWith: []
    })
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
      sharedWith: selectedEvent.sharedWith || []
    })
    setShowEventDetailsModal(false)
    setShowCreateModal(true)
    setSelectedEvent(null)
  }

  const handleUpdateEvent = () => {
    if (!selectedEvent || !newEvent.title.trim() || !isAdmin) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
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
      sharedWith: newEvent.sharedWith,
      updatedAt: nowISO(),
    }

    setEvents(events.map(e => e.id === selectedEvent.id ? updatedEvent : e))
    setToast({ message: 'Event updated successfully', type: 'success' })
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
      sharedWith: []
    })
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    // Only open create modal for admins
    if (isAdmin) {
      setNewEvent({
        ...newEvent,
        date: date.toISOString().split('T')[0]
      })
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

  const handleJoinEvent = (event: Event) => {
    // Navigate to video room or meeting
    const roomId = (event as any).roomId
    if (roomId) {
      navigate(`/rooms/${roomId}`)
    } else {
      // Show event details instead of demo mode
      setSelectedEvent(event)
      setShowEventDetailsModal(true)
      // Track meeting opened
      if (user?.id) {
        trackMeetingOpened(event.id, event.title, user.id)
      }
    }
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

  // AI Scheduling Suggestions
  const getAISchedulingSuggestions = async () => {
    setShowAiScheduling(true)
    setAiSchedulingSuggestions('')
    setIsGeneratingSuggestions(true)
    
    try {
      const token = getToken() || 'mock-token-for-testing'
      const participants = ['Current User']
      const duration = '30 minutes'
      const preferences = {
        workingHours: '9:00 AM - 5:00 PM',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
      
      const response = await axios.post(
        '/api/ai/scheduling-suggestions',
        { participants, duration, preferences },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setAiSchedulingSuggestions(response.data.suggestions || 'Unable to generate suggestions.')
    } catch (error: any) {
      console.error('AI scheduling error:', error)
      setAiSchedulingSuggestions('Unable to generate scheduling suggestions at this time.')
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }

  // Get days for month view
  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h1 className="page-title">Calendar</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={getAISchedulingSuggestions}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  title="Get AI scheduling suggestions"
                >
                  <FaRobot /> AI Scheduling
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary"
                  >
                    <FaPlus /> Add Event
                  </button>
                )}
              </div>
            </div>
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

            {/* Month View */}
            {viewMode === 'month' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {weekDays.map(day => (
                        <th key={day} className="p-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.ceil(monthDays.length / 7) }).map((_, weekIndex) => (
                      <tr key={weekIndex}>
                        {weekDays.map((_, dayIndex) => {
                          const dayIndexInMonth = weekIndex * 7 + dayIndex
                          const date = monthDays[dayIndexInMonth]
                          const dayEvents = date ? getEventsForDate(date) : []
                          
                          return (
                            <td
                              key={dayIndex}
                              className={`p-2 border border-gray-200 dark:border-gray-700 min-h-[100px] align-top ${
                                !date ? 'bg-gray-50 dark:bg-gray-900/50' : ''
                              } ${
                                date && isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              } ${
                                date && selectedDate.getTime() === date.getTime() ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                              }`}
                            >
                              {date && (
                                <button
                                  onClick={() => handleDateClick(date)}
                                  className={`w-full text-left mb-1 ${
                                    isToday(date)
                                      ? 'font-bold text-blue-600 dark:text-blue-400'
                                      : 'text-gray-900 dark:text-white'
                                  }`}
                                >
                                  {date.getDate()}
                                </button>
                              )}
                              {date && dayEvents.length > 0 && (
                                <div className="space-y-1">
                                  {dayEvents.slice(0, 3).map(event => (
                                    <button
                                      key={event.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEventClick(event)
                                      }}
                                      className="w-full text-xs p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded truncate hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                      title={event.title}
                                    >
                                      {event.title}
                                    </button>
                                  ))}
                                  {dayEvents.length > 3 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-500">
                                      +{dayEvents.length - 3} more
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
                          {dayEvents.map(event => (
                            <button
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEventClick(event)
                              }}
                              className="w-full text-xs p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 text-left"
                            >
                              <div className="font-semibold truncate">{event.title}</div>
                              <div className="text-xs opacity-75">{event.time}</div>
                            </button>
                          ))}
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
                          {hourEvents.map(event => (
                            <button
                              key={event.id}
                              onClick={() => handleEventClick(event)}
                              className="w-full mb-2 p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 text-left"
                            >
                              <div className="font-semibold">{event.title}</div>
                              <div className="text-sm opacity-75">{event.time}</div>
                            </button>
                          ))}
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
                {selectedDateEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{event.title}</h4>
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
                ))}
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
                sharedWith: []
              })
              if (selectedEvent) setSelectedEvent(null)
            }}
            title={selectedEvent ? 'Edit Event' : 'Add New Event'}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Enter event title"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    From *
                  </label>
                  <input
                    type="time"
                    value={newEvent.from}
                    onChange={(e) => setNewEvent({ ...newEvent, from: e.target.value })}
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
                    onChange={(e) => setNewEvent({ ...newEvent, to: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
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
                  placeholder="Enter event description"
                />
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
                      sharedWith: []
                    })
                    if (selectedEvent) setSelectedEvent(null)
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={selectedEvent ? handleUpdateEvent : handleCreateEvent}
                  className="btn-primary flex-1"
                >
                  {selectedEvent ? 'Update Event' : 'Create Event'}
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
          title="Event Details"
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
                <button
                  onClick={() => handleJoinEvent(selectedEvent)}
                  className="btn-primary flex-1"
                >
                  <FaVideo /> Join
                </button>
                {isAdmin && (
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
              </div>
            </div>
          )}
        </Modal>

        {/* AI Scheduling Suggestions Modal */}
        <Modal
          isOpen={showAiScheduling}
          onClose={() => {
            setShowAiScheduling(false)
            setAiSchedulingSuggestions('')
          }}
          title="AI Scheduling Suggestions"
        >
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <FaRobot className="inline mr-2 text-blue-500" />
                AI-powered scheduling suggestions:
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 max-h-96 overflow-y-auto">
              {isGeneratingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <FaSpinner className="animate-spin text-blue-600 dark:text-blue-400 text-2xl" />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Generating suggestions...</span>
                </div>
              ) : aiSchedulingSuggestions ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{aiSchedulingSuggestions}</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No suggestions available
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAiScheduling(false)
                  setAiSchedulingSuggestions('')
                }}
                className="btn-secondary flex-1"
              >
                Close
              </button>
            </div>
          </div>
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
