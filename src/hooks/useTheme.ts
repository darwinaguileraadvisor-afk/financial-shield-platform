import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('fs-theme') as 'dark' | 'light') || 'dark'
  })

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
    localStorage.setItem('fs-theme', theme)
  }, [theme])

  // Apply on mount from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('fs-theme')
    if (saved === 'light') {
      document.documentElement.classList.add('light')
    }
  }, [])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return { theme, toggleTheme }
}
