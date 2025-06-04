"use client"

import { Button } from "@/components/ui/button"
import { Settings, LogOut } from "lucide-react"
import type { User } from "@/types"

interface UserProfileProps {
  user: User
  onOpenProfile: () => void
  onLogout: () => void
}

export function UserProfile({ user, onOpenProfile, onLogout }: UserProfileProps) {
  return (
    <div className="w-60 bg-zinc-800 border-l border-zinc-700">
      <div className="bg-zinc-700 rounded-lg p-3 m-2">
        <div className="flex items-center space-x-3 mb-3">
          <img
            src={user.avatar || "/placeholder.svg"}
            alt={user.nickname}
            className="w-10 h-10 rounded-full cursor-pointer ring-1 ring-zinc-600"
            onClick={onOpenProfile}
          />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">{user.nickname}</p>
            <p className="text-xs text-zinc-400 truncate">{user.isGuest ? "Convidado" : "Online"}</p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={onOpenProfile}
            variant="ghost"
            size="sm"
            className="flex-1 text-zinc-300 hover:text-white hover:bg-zinc-600"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            onClick={onLogout}
            variant="ghost"
            size="sm"
            className="flex-1 text-zinc-300 hover:text-white hover:bg-zinc-600"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
