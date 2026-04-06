import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('fs-theme') as 'dark' | 'light') || 'light'
  })

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
    localStorage.setItem('fs-theme', theme)
  }, [theme])

  // Apply on mount from localStorage (default to light when no preference saved)
  useEffect(() => {
    const saved = localStorage.getItem('fs-theme')
    if (!saved || saved === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }, [])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return { theme, toggleTheme }
}
