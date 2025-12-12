import { useState } from 'react'
import { FaUsers, FaCog, FaShieldAlt, FaDatabase, FaChartLine, FaKey, FaRobot, FaLightbulb } from 'react-icons/fa'

const Administration = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'security' | 'database' | 'analytics'>('users')

  const tabs = [
    { id: 'users', label: 'Users', icon: FaUsers },
    { id: 'settings', label: 'Settings', icon: FaCog },
    { id: 'security', label: 'Security', icon: FaShieldAlt },
    { id: 'database', label: 'Database', icon: FaDatabase },
    { id: 'analytics', label: 'Analytics', icon: FaChartLine }
  ]

  const users = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' }
  ]

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white mb-2">
              Administration
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
              Manage system and settings
            </p>
        </div>

        {/* AI Features Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* AI User Management Suggestions */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <FaRobot className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI User Management</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Smart suggestions for user management</p>
            <div className="space-y-2">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Recommendation</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Consider promoting 2 users to Admin role</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Alert</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">3 inactive users detected - review needed</p>
              </div>
            </div>
          </div>

          {/* AI Performance Analytics */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200/50 dark:border-green-800/50 shadow-xl shadow-green-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <FaLightbulb className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Performance Analytics</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">AI-powered performance insights</p>
            <div className="space-y-2">
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">System Performance</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">↑ 12% improvement this month</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">User Engagement</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">↑ 8% increase in active users</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 border-b-2 ${
                      activeTab === tab.id
                        ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon /> {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    User Management
                  </h2>
                         <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200">
                           Add User
                         </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {user.role}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                user.status === 'Active'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              }`}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mr-4">
                              Edit
                            </button>
                            <button className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  System Settings
                </h2>
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      General Settings
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Configure general system settings
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Email Settings
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Configure email settings
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Security Settings
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Two-Factor Authentication
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Enable 2FA for all users
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md">
                      Enable
                    </button>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">
                        Login Logs
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        View login logs
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-all">
                      View
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Database Management
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">1.2 GB</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Database Size
                    </div>
                  </div>
                  <div className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">99.9%</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Uptime
                    </div>
                  </div>
                  <div className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">24/7</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Monitoring
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Analytics & Statistics
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">1,234</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Active Users
                    </div>
                  </div>
                  <div className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">5,678</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Files
                    </div>
                  </div>
                  <div className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">890</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Meetings
                    </div>
                  </div>
                  <div className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">12.5 TB</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Storage Used
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Administration

