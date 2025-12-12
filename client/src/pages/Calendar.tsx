import { useState } from 'react'
import { FaPlus, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaRobot, FaLightbulb } from 'react-icons/fa'

interface Event {
  id: string
  title: string
  description: string
  date: Date
  time: string
  location?: string
}

const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([
    {
      id: '1',
      title: 'Team Meeting',
      description: 'Weekly team sync',
      date: new Date(),
      time: '10:00 AM',
      location: 'Conference Room A'
    },
    {
      id: '2',
      title: 'Project Review',
      description: 'Review project progress',
      date: new Date(Date.now() + 86400000),
      time: '2:00 PM',
      location: 'Online'
    }
  ])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    location: ''
  })

  const handleCreateEvent = () => {
    if (newEvent.title.trim()) {
      const event: Event = {
        id: Date.now().toString(),
        title: newEvent.title,
        description: newEvent.description,
        date: new Date(newEvent.date),
        time: newEvent.time,
        location: newEvent.location || undefined
      }
      setEvents([...events, event])
      setNewEvent({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        location: ''
      })
      setShowCreateModal(false)
    }
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(
      (e) =>
        e.date.getDate() === date.getDate() &&
        e.date.getMonth() === date.getMonth() &&
        e.date.getFullYear() === date.getFullYear()
    )
  }

  const todayEvents = getEventsForDate(selectedDate)

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white mb-2">
              Calendar
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
              Manage events and meetings
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <FaPlus className="text-xs" /> Add Event
          </button>
        </div>

        {/* AI Features Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* AI Smart Scheduling */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <FaRobot className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Smart Scheduling</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Automatically find the best meeting times</p>
            <div className="space-y-2">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Suggested Times</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Tomorrow 10:00 AM - 95% availability</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Friday 2:00 PM - 90% availability</p>
              </div>
              <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200">
                Find Best Time
              </button>
            </div>
          </div>

          {/* AI Meeting Prediction */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200/50 dark:border-green-800/50 shadow-xl shadow-green-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <FaLightbulb className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Meeting Prediction</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Predict meeting outcomes and conflicts</p>
            <div className="space-y-2">
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Prediction</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">High probability of schedule conflict next week</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">3 meetings may overlap</p>
              </div>
              <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors duration-200">
                View Predictions
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Calendar View */}
          <div className="md:col-span-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all"
                >
                  ←
                </button>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all"
                >
                  Today
                </button>
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all"
                >
                  →
                </button>
              </div>
            </div>
            <div className="text-center">
              <div className="text-7xl font-bold bg-gradient-to-br from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent mb-3 drop-shadow-lg">
                {selectedDate.getDate()}
              </div>
              <div className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border-2 border-green-200/50 dark:border-green-800/50 shadow-xl shadow-green-500/10 p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FaCalendarAlt /> Events
            </h3>
            {todayEvents.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No events for this day
              </p>
            ) : (
              <div className="space-y-4">
                {todayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{event.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{event.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <FaClock /> {event.time}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <FaMapMarkerAlt /> {event.location}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-xl">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Add New Event
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateEvent}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-all"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Calendar

