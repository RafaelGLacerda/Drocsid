"use client"

import { useEffect, useRef, useState } from "react"
import { wsManager, type OnlineUser, type VoiceState } from "@/lib/websocket"
import type { User, Message } from "@/types"

export function useWebSocket(user: User | null) {
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [voiceStates, setVoiceStates] = useState<VoiceState[]>([])
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [connectionMode, setConnectionMode] = useState<"online" | "offline">("offline")
  const reconnectAttempt = useRef(0)

  useEffect(() => {
    if (!user) return

    // Event listeners
    const handleConnected = () => {
      setIsConnected(true)
      setIsReconnecting(false)
      setConnectionMode(wsManager.connectionState === "offline-mode" ? "offline" : "online")
      reconnectAttempt.current = 0

      // Carregar dados iniciais
      setOnlineUsers(wsManager.getOnlineUsers())
      setVoiceStates(wsManager.getVoiceStates())
    }

    const handleDisconnected = () => {
      setIsConnected(false)
      setConnectionMode("offline")
    }

    const handleReconnecting = (attempt: number) => {
      setIsReconnecting(true)
      reconnectAttempt.current = attempt
    }

    const handleUserJoin = (data: { user: User }) => {
      setOnlineUsers((prev) => {
        const exists = prev.find((u) => u.id === data.user.id)
        if (exists) return prev

        const newUser: OnlineUser = {
          id: data.user.id,
          nickname: data.user.nickname,
          avatar: data.user.avatar,
          status: "online",
          lastSeen: new Date(),
        }

        return [...prev, newUser]
      })
    }

    const handleUserLeave = (data: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== data.userId))
      setVoiceStates((prev) => prev.filter((v) => v.userId !== data.userId))
    }

    const handleUsersOnline = (data: { users: OnlineUser[] }) => {
      setOnlineUsers(
        data.users.map((u) => ({
          ...u,
          lastSeen: new Date(u.lastSeen),
        })),
      )
    }

    const handleVoiceJoin = (data: { voiceState: VoiceState }) => {
      setVoiceStates((prev) => {
        const filtered = prev.filter((v) => v.userId !== data.voiceState.userId)
        return [...filtered, data.voiceState]
      })

      // Salvar no localStorage para modo offline
      if (wsManager.connectionState === "offline-mode") {
        const voiceStates = wsManager.getVoiceStates()
        const filtered = voiceStates.filter((v) => v.userId !== data.voiceState.userId)
        const updated = [...filtered, data.voiceState]
        localStorage.setItem("drocsid-voice-states", JSON.stringify(updated))
      }
    }

    const handleVoiceLeave = (data: { userId: string }) => {
      setVoiceStates((prev) => prev.filter((v) => v.userId !== data.userId))

      // Atualizar localStorage para modo offline
      if (wsManager.connectionState === "offline-mode") {
        const voiceStates = wsManager.getVoiceStates()
        const filtered = voiceStates.filter((v) => v.userId !== data.userId)
        localStorage.setItem("drocsid-voice-states", JSON.stringify(filtered))
      }
    }

    const handleVoiceState = (data: { userId: string; state: Partial<VoiceState> }) => {
      setVoiceStates((prev) => prev.map((v) => (v.userId === data.userId ? { ...v, ...data.state } : v)))

      // Atualizar localStorage para modo offline
      if (wsManager.connectionState === "offline-mode") {
        const voiceStates = wsManager.getVoiceStates()
        const updated = voiceStates.map((v) => (v.userId === data.userId ? { ...v, ...data.state } : v))
        localStorage.setItem("drocsid-voice-states", JSON.stringify(updated))
      }
    }

    // Register event listeners
    wsManager.on("connected", handleConnected)
    wsManager.on("disconnected", handleDisconnected)
    wsManager.on("reconnecting", handleReconnecting)
    wsManager.on("user_join", handleUserJoin)
    wsManager.on("user_leave", handleUserLeave)
    wsManager.on("users_online", handleUsersOnline)
    wsManager.on("voice_join", handleVoiceJoin)
    wsManager.on("voice_leave", handleVoiceLeave)
    wsManager.on("voice_state", handleVoiceState)

    // Connect
    wsManager.connect(user)

    // Polling para atualizar dados no modo offline
    const pollInterval = setInterval(() => {
      if (wsManager.connectionState === "offline-mode") {
        setOnlineUsers(wsManager.getOnlineUsers())
        setVoiceStates(wsManager.getVoiceStates())
      }
    }, 5000)

    return () => {
      clearInterval(pollInterval)

      // Cleanup event listeners
      wsManager.off("connected", handleConnected)
      wsManager.off("disconnected", handleDisconnected)
      wsManager.off("reconnecting", handleReconnecting)
      wsManager.off("user_join", handleUserJoin)
      wsManager.off("user_leave", handleUserLeave)
      wsManager.off("users_online", handleUsersOnline)
      wsManager.off("voice_join", handleVoiceJoin)
      wsManager.off("voice_leave", handleVoiceLeave)
      wsManager.off("voice_state", handleVoiceState)

      // Disconnect
      wsManager.disconnect()
    }
  }, [user])

  return {
    isConnected,
    isReconnecting,
    connectionMode,
    reconnectAttempt: reconnectAttempt.current,
    onlineUsers,
    voiceStates,
    sendMessage: (message: Message, channelId: string) => wsManager.sendMessage(message, channelId),
    joinVoiceChannel: (channelId: string) => user && wsManager.joinVoiceChannel(user.id, channelId),
    leaveVoiceChannel: () => user && wsManager.leaveVoiceChannel(user.id),
    updateVoiceState: (state: Partial<VoiceState>) => user && wsManager.updateVoiceState(user.id, state),
    joinServer: (serverId: string) => user && wsManager.joinServer(serverId),
    leaveServer: (serverId: string) => user && wsManager.leaveVoiceChannel(user.id),
    startTyping: (channelId: string) => user && wsManager.startTyping(channelId),
    stopTyping: (channelId: string) => user && wsManager.stopTyping(channelId),
  }
}
