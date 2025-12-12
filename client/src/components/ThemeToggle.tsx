import { useState, useEffect } from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('theme')
    if (saved) {
      return saved === 'dark'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 hover:from-blue-100 hover:to-green-100 dark:hover:from-blue-900/30 dark:hover:to-green-900/30 transition-all duration-300 flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300 font-semibold"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <>
          <FaSun className="text-yellow-500 text-lg" />
          <span className="text-sm">Light Mode</span>
        </>
      ) : (
        <>
          <FaMoon className="text-blue-600 dark:text-blue-400 text-lg" />
          <span className="text-sm">Dark Mode</span>
        </>
      )}
    </button>
  )
}

export default ThemeToggle

