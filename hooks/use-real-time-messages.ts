"use client"

import { useEffect, useState } from "react"
import { wsManager } from "@/lib/websocket"
import type { Message } from "@/types"

export function useRealTimeMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!channelId) return

    // Load existing messages
    const savedMessages = JSON.parse(localStorage.getItem("drocsid-messages") || "[]") as Message[]
    const channelMessages = savedMessages
      .filter((m) => m.channelId === channelId)
      .map((m) => ({ ...m, timestamp: new Date(m.timestamp) }))

    setMessages(channelMessages)

    // Real-time message handler
    const handleNewMessage = (data: { message: Message; channelId: string }) => {
      if (data.channelId === channelId) {
        setMessages((prev) => {
          const exists = prev.find((m) => m.id === data.message.id)
          if (exists) return prev
          return [...prev, { ...data.message, timestamp: new Date(data.message.timestamp) }]
        })

        // Save to localStorage
        const allMessages = JSON.parse(localStorage.getItem("drocsid-messages") || "[]")
        allMessages.push(data.message)
        localStorage.setItem("drocsid-messages", JSON.stringify(allMessages))
      }
    }

    const handleTypingStart = (data: { userId: string; channelId: string }) => {
      if (data.channelId === channelId) {
        setTypingUsers((prev) => new Set([...prev, data.userId]))

        // Auto-remove typing after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => {
            const newSet = new Set(prev)
            newSet.delete(data.userId)
            return newSet
          })
        }, 3000)
      }
    }

    const handleTypingStop = (data: { userId: string; channelId: string }) => {
      if (data.channelId === channelId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(data.userId)
          return newSet
        })
      }
    }

    wsManager.on("message_send", handleNewMessage)
    wsManager.on("typing_start", handleTypingStart)
    wsManager.on("typing_stop", handleTypingStop)

    return () => {
      wsManager.off("message_send", handleNewMessage)
      wsManager.off("typing_start", handleTypingStart)
      wsManager.off("typing_stop", handleTypingStop)
    }
  }, [channelId])

  return {
    messages,
    typingUsers: Array.from(typingUsers),
  }
}
