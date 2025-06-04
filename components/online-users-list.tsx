"use client"

import { Users } from "lucide-react"
import type { OnlineUser, VoiceState } from "@/lib/websocket"

interface OnlineUsersListProps {
  onlineUsers: OnlineUser[]
  voiceStates: VoiceState[]
  currentChannelId?: string
}

export function OnlineUsersList({ onlineUsers, voiceStates, currentChannelId }: OnlineUsersListProps) {
  const voiceUsersInChannel = currentChannelId ? voiceStates.filter((v) => v.channelId === currentChannelId) : []

  const getStatusColor = (status: OnlineUser["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "away":
        return "bg-amber-500"
      case "busy":
        return "bg-red-500"
      default:
        return "bg-zinc-500"
    }
  }

  return (
    <div className="space-y-4">
      {/* Voice Channel Users */}
      {currentChannelId && voiceUsersInChannel.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Users className="w-3 h-3" />
            No Canal de Voz ({voiceUsersInChannel.length})
          </h4>
          <div className="space-y-1">
            {voiceUsersInChannel.map((voiceState) => {
              const user = onlineUsers.find((u) => u.id === voiceState.userId)
              if (!user) return null

              return (
                <div key={voiceState.userId} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-700/50">
                  <div className="relative">
                    <img src={user.avatar || "/placeholder.svg"} alt={user.nickname} className="w-6 h-6 rounded-full" />
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-800 ${getStatusColor(user.status)}`}
                    />
                    {voiceState.isSpeaking && (
                      <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{user.nickname}</p>
                    <div className="flex items-center gap-1 text-xs text-zinc-400">
                      {voiceState.isMuted && <span>🔇</span>}
                      {voiceState.isDeafened && <span>🔊</span>}
                      {voiceState.isSpeaking && <span className="text-green-400">🎤</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* All Online Users */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Users className="w-3 h-3" />
          Online ({onlineUsers.length})
        </h4>
        <div className="space-y-1">
          {onlineUsers.map((user) => (
            <div key={user.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-700/50">
              <div className="relative">
                <img src={user.avatar || "/placeholder.svg"} alt={user.nickname} className="w-6 h-6 rounded-full" />
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-800 ${getStatusColor(user.status)}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{user.nickname}</p>
                <p className="text-xs text-zinc-400 capitalize">{user.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
