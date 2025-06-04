"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Hash, Send } from "lucide-react"
import { TypingIndicator } from "@/components/typing-indicator"
import { useRealTimeMessages } from "@/hooks/use-real-time-messages"
import type { Channel, OnlineUser } from "@/types"

interface ChatAreaProps {
  channel: Channel
  onSendMessage: (content: string, channelId: string) => void
  onStartTyping: () => void
  onStopTyping: () => void
  onlineUsers: OnlineUser[]
}

export function ChatArea({ channel, onSendMessage, onStartTyping, onStopTyping, onlineUsers }: ChatAreaProps) {
  const [messageInput, setMessageInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const { messages, typingUsers } = useRealTimeMessages(channel.id)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      onSendMessage(messageInput.trim(), channel.id)
      setMessageInput("")
      handleStopTyping()
    }
  }

  const handleInputChange = (value: string) => {
    setMessageInput(value)

    if (value.trim() && !isTyping) {
      setIsTyping(true)
      onStartTyping()
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping()
    }, 2000)
  }

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false)
      onStopTyping()
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col bg-zinc-900">
      {/* Channel Header */}
      <div className="h-12 px-4 flex items-center border-b border-zinc-700 shadow-sm bg-zinc-800">
        <Hash className="w-5 h-5 text-zinc-400 mr-2" />
        <h3 className="text-white font-semibold">{channel.name}</h3>
        <div className="ml-auto text-xs text-zinc-400">
          {messages.length} mensagem{messages.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Hash className="w-16 h-16 text-zinc-600 mb-4" />
            <h3 className="text-xl text-white mb-2">Bem-vindo ao #{channel.name}!</h3>
            <p className="text-zinc-400">Este é o início da conversa neste canal.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="flex items-start space-x-3 hover:bg-zinc-800/50 p-2 rounded-lg transition-colors"
            >
              <img
                src={message.author.avatar || "/placeholder.svg"}
                alt={message.author.nickname}
                className="w-10 h-10 rounded-full ring-1 ring-zinc-700"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-white font-semibold">{message.author.nickname}</span>
                  <span className="text-xs text-zinc-400">{message.timestamp.toLocaleTimeString()}</span>
                </div>
                <p className="text-zinc-300">{message.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      <TypingIndicator typingUserIds={typingUsers} onlineUsers={onlineUsers} />

      {/* Message Input */}
      <div className="p-4">
        <div className="flex items-center space-x-2 bg-zinc-800 rounded-lg px-4 py-3 border border-zinc-700">
          <Input
            value={messageInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onBlur={handleStopTyping}
            placeholder={`Mensagem #${channel.name}`}
            className="flex-1 bg-transparent border-none text-white placeholder-zinc-500 focus:ring-0"
          />
          <Button onClick={handleSendMessage} size="sm" className="bg-zinc-700 hover:bg-zinc-600">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
