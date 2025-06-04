"use client"

import { useState, useEffect } from "react"
import { ServerList } from "@/components/server-list"
import { ChannelList } from "@/components/channel-list"
import { ChatArea } from "@/components/chat-area"
import { VoiceChat } from "@/components/voice-chat"
import { UserProfile } from "@/components/user-profile"
import { ProfileModal } from "@/components/profile-modal"
import { FriendsModal } from "@/components/friends-modal"
import { WelcomeScreen } from "@/components/welcome-screen"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ConnectionStatus } from "@/components/connection-status"
import { OnlineUsersList } from "@/components/online-users-list"
import { loadServers, saveServers } from "@/lib/storage"
import { cleanExpiredInvites, syncInvites } from "@/lib/invite-system"
import { saveRegisteredUser } from "@/lib/friends-system"
import { useWebSocket } from "@/hooks/use-websocket"
import type { User, Server, Channel } from "@/types"

interface MainAppProps {
  user: User
  onLogout: () => void
}

export function MainApp({ user, onLogout }: MainAppProps) {
  const [servers, setServers] = useState<Server[]>([])
  const [selectedServer, setSelectedServer] = useState<Server | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isFriendsOpen, setIsFriendsOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User>(user)
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    type: "delete" | "leave" | "other"
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "other",
  })

  // WebSocket connection com fallback automático
  const {
    isConnected,
    isReconnecting,
    connectionMode,
    reconnectAttempt,
    onlineUsers,
    voiceStates,
    sendMessage,
    joinVoiceChannel,
    leaveVoiceChannel,
    updateVoiceState,
    joinServer,
    startTyping,
    stopTyping,
  } = useWebSocket(currentUser)

  // Salvar usuário na lista global quando o app inicia
  useEffect(() => {
    saveRegisteredUser(currentUser)
  }, [currentUser])

  // Carregar dados do localStorage e sincronizar
  useEffect(() => {
    const savedServers = loadServers()
    setServers(savedServers)
    cleanExpiredInvites()
    syncInvites()

    // Sincronizar dados a cada 10 segundos
    const syncInterval = setInterval(() => {
      syncInvites()
    }, 10000)

    return () => clearInterval(syncInterval)
  }, [])

  // Salvar dados quando mudam
  useEffect(() => {
    saveServers(servers)
  }, [servers])

  useEffect(() => {
    if (servers.length > 0 && !selectedServer) {
      setSelectedServer(servers[0])
    }
  }, [servers, selectedServer])

  useEffect(() => {
    if (selectedServer && selectedServer.channels.length > 0 && !selectedChannel) {
      setSelectedChannel(selectedServer.channels[0])
    }
  }, [selectedServer, selectedChannel])

  const handleSendMessage = (content: string, channelId: string) => {
    const newMessage = {
      id: Date.now().toString(),
      content,
      author: currentUser,
      timestamp: new Date(),
      channelId,
    }

    // Send via WebSocket ou localStorage
    sendMessage(newMessage, channelId)
  }

  const handleCreateServer = (name: string) => {
    const serverId = Date.now().toString()
    const newServer: Server = {
      id: serverId,
      name,
      icon: "/placeholder.svg?height=48&width=48",
      channels: [
        {
          id: serverId + "-general",
          name: "geral",
          type: "text",
          serverId: serverId,
        },
        {
          id: serverId + "-voice",
          name: "Sala de Voz",
          type: "voice",
          serverId: serverId,
        },
      ],
      members: [currentUser],
      ownerId: currentUser.id,
    }

    setServers((prev) => [...prev, newServer])
    setSelectedServer(newServer)

    // Salvar servidor globalmente para convites
    try {
      const globalServers = JSON.parse(localStorage.getItem("drocsid-global-servers") || "[]")
      globalServers.push(newServer)
      localStorage.setItem("drocsid-global-servers", JSON.stringify(globalServers))
    } catch (error) {
      console.error("Error saving server globally:", error)
    }

    // Notify via WebSocket ou localStorage
    joinServer(newServer.id)
  }

  const handleServerJoined = (server: Server) => {
    console.log("🎉 Servidor recebido no main-app:", server)

    setServers((prev) => {
      const existingIndex = prev.findIndex((s) => s.id === server.id)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = server
        return updated
      } else {
        return [...prev, server]
      }
    })
    setSelectedServer(server)

    // Notify via WebSocket ou localStorage
    joinServer(server.id)
  }

  const handleCreateChannel = (name: string, type: "text" | "voice") => {
    if (!selectedServer) return

    const newChannel: Channel = {
      id: Date.now().toString(),
      name,
      type,
      serverId: selectedServer.id,
    }

    const updatedServer = {
      ...selectedServer,
      channels: [...selectedServer.channels, newChannel],
    }

    setServers((prev) => prev.map((s) => (s.id === selectedServer.id ? updatedServer : s)))
    setSelectedServer(updatedServer)
    setSelectedChannel(newChannel)

    // Atualizar servidor globalmente
    try {
      const globalServers = JSON.parse(localStorage.getItem("drocsid-global-servers") || "[]")
      const globalIndex = globalServers.findIndex((s: Server) => s.id === selectedServer.id)
      if (globalIndex >= 0) {
        globalServers[globalIndex] = updatedServer
        localStorage.setItem("drocsid-global-servers", JSON.stringify(globalServers))
      }
    } catch (error) {
      console.error("Error updating server globally:", error)
    }
  }

  const handleLeaveServer = (serverId: string) => {
    setConfirmAction({
      isOpen: true,
      title: "Sair do Servidor",
      message: "Tem certeza que deseja sair deste servidor?",
      onConfirm: () => {
        setServers((prev) => prev.filter((s) => s.id !== serverId))
        if (selectedServer?.id === serverId) {
          setSelectedServer(null)
          setSelectedChannel(null)
        }
        leaveVoiceChannel()
      },
      type: "leave",
    })
  }

  const handleDeleteServer = (serverId: string) => {
    setConfirmAction({
      isOpen: true,
      title: "Excluir Servidor",
      message: "Tem certeza que deseja excluir este servidor? Esta ação não pode ser desfeita.",
      onConfirm: () => {
        setServers((prev) => prev.filter((s) => s.id !== serverId))
        if (selectedServer?.id === serverId) {
          setSelectedServer(null)
          setSelectedChannel(null)
        }
        leaveVoiceChannel()

        // Remover servidor globalmente
        try {
          const globalServers = JSON.parse(localStorage.getItem("drocsid-global-servers") || "[]")
          const filteredServers = globalServers.filter((s: Server) => s.id !== serverId)
          localStorage.setItem("drocsid-global-servers", JSON.stringify(filteredServers))
        } catch (error) {
          console.error("Error removing server globally:", error)
        }
      },
      type: "delete",
    })
  }

  const handleUpdateProfile = (updatedUser: User) => {
    setCurrentUser(updatedUser)
    localStorage.setItem("drocsid-user", JSON.stringify(updatedUser))
    // Atualizar na lista global também
    saveRegisteredUser(updatedUser)
  }

  const handleJoinVoiceChannel = (channelId: string) => {
    joinVoiceChannel(channelId)
  }

  const handleLeaveVoiceChannel = () => {
    leaveVoiceChannel()
  }

  const handleUpdateVoiceState = (state: any) => {
    updateVoiceState(state)
  }

  return (
    <div className="flex h-screen bg-zinc-900">
      <div className="relative z-10 flex w-full">
        {/* Server List */}
        <ServerList
          servers={servers}
          selectedServer={selectedServer}
          onSelectServer={setSelectedServer}
          onCreateServer={handleCreateServer}
          onLeaveServer={handleLeaveServer}
          onDeleteServer={handleDeleteServer}
          onServerJoined={handleServerJoined}
          currentUser={currentUser}
          onOpenFriends={() => setIsFriendsOpen(true)}
        />

        {/* Channel List */}
        {selectedServer && (
          <ChannelList
            server={selectedServer}
            selectedChannel={selectedChannel}
            onSelectChannel={setSelectedChannel}
            onCreateChannel={handleCreateChannel}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Connection Status */}
          <div className="h-8 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between px-4">
            <ConnectionStatus
              isConnected={isConnected}
              isReconnecting={isReconnecting}
              reconnectAttempt={reconnectAttempt}
              connectionMode={connectionMode}
            />
            <div className="text-xs text-zinc-400">
              {onlineUsers.length} usuário{onlineUsers.length !== 1 ? "s" : ""}{" "}
              {connectionMode === "online" ? "online" : "conectado"}
            </div>
          </div>

          {!selectedServer ? (
            <WelcomeScreen onCreateServer={handleCreateServer} />
          ) : selectedChannel?.type === "text" ? (
            <ChatArea
              channel={selectedChannel}
              onSendMessage={handleSendMessage}
              onStartTyping={() => startTyping(selectedChannel.id)}
              onStopTyping={() => stopTyping(selectedChannel.id)}
              onlineUsers={onlineUsers}
            />
          ) : selectedChannel?.type === "voice" ? (
            <VoiceChat
              channel={selectedChannel}
              user={currentUser}
              onJoinVoice={() => handleJoinVoiceChannel(selectedChannel.id)}
              onLeaveVoice={handleLeaveVoiceChannel}
              onUpdateVoiceState={handleUpdateVoiceState}
              voiceUsers={voiceStates.filter((v) => v.channelId === selectedChannel.id)}
              onlineUsers={onlineUsers}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400">Selecione um canal para começar</div>
          )}
        </div>

        {/* Online Users Sidebar */}
        <div className="w-60 bg-zinc-800 border-l border-zinc-700 p-4">
          <OnlineUsersList onlineUsers={onlineUsers} voiceStates={voiceStates} currentChannelId={selectedChannel?.id} />
        </div>

        {/* User Profile */}
        <UserProfile user={currentUser} onOpenProfile={() => setIsProfileOpen(true)} onLogout={onLogout} />

        {/* Profile Modal */}
        <ProfileModal
          user={currentUser}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onUpdateProfile={handleUpdateProfile}
        />

        {/* Friends Modal */}
        <FriendsModal
          isOpen={isFriendsOpen}
          onClose={() => setIsFriendsOpen(false)}
          user={currentUser}
          onlineUsers={onlineUsers}
        />

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmAction.isOpen}
          title={confirmAction.title}
          message={confirmAction.message}
          type={confirmAction.type}
          onConfirm={() => {
            confirmAction.onConfirm()
            setConfirmAction((prev) => ({ ...prev, isOpen: false }))
          }}
          onCancel={() => setConfirmAction((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    </div>
  )
}
