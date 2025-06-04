"use client"

import { useEffect, useState } from "react"

interface TypingIndicatorProps {
  typingUserIds: string[]
  onlineUsers: Array<{ id: string; nickname: string }>
}

export function TypingIndicator({ typingUserIds, onlineUsers }: TypingIndicatorProps) {
  const [dots, setDots] = useState("")

  useEffect(() => {
    if (typingUserIds.length === 0) return

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return ""
        return prev + "."
      })
    }, 500)

    return () => clearInterval(interval)
  }, [typingUserIds.length])

  if (typingUserIds.length === 0) return null

  const typingUsers = typingUserIds
    .map((id) => onlineUsers.find((u) => u.id === id))
    .filter(Boolean)
    .map((u) => u!.nickname)

  let text = ""
  if (typingUsers.length === 1) {
    text = `${typingUsers[0]} está digitando${dots}`
  } else if (typingUsers.length === 2) {
    text = `${typingUsers[0]} e ${typingUsers[1]} estão digitando${dots}`
  } else if (typingUsers.length > 2) {
    text = `${typingUsers.length} pessoas estão digitando${dots}`
  }

  return <div className="px-4 py-2 text-sm text-zinc-400 italic">{text}</div>
}
