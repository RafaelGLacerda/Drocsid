"use client"

import { useState, useEffect } from "react"
import { AuthScreen } from "@/components/auth-screen"
import { MainApp } from "@/components/main-app"
import { loadUser, saveUser } from "@/lib/storage"
import type { User } from "@/types"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = loadUser()
    if (savedUser) {
      setUser(savedUser)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (userData: User) => {
    setUser(userData)
    saveUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("drocsid-user")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      {!user ? <AuthScreen onLogin={handleLogin} /> : <MainApp user={user} onLogout={handleLogout} />}
    </div>
  )
}
