"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import type { User } from "@/types"

interface ProfileModalProps {
  user: User
  isOpen: boolean
  onClose: () => void
  onUpdateProfile: (user: User) => void
}

export function ProfileModal({ user, isOpen, onClose, onUpdateProfile }: ProfileModalProps) {
  const [nickname, setNickname] = useState(user.nickname)
  const [bio, setBio] = useState(user.bio)
  const [avatarUrl, setAvatarUrl] = useState(user.avatar)

  const handleSave = () => {
    const updatedUser: User = {
      ...user,
      nickname: nickname.trim() || user.nickname,
      bio: bio.trim(),
      avatar: avatarUrl.trim() || user.avatar,
    }

    onUpdateProfile(updatedUser)
    onClose()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-zinc-800 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center space-y-4">
            <img
              src={avatarUrl || "/placeholder.svg"}
              alt="Avatar"
              className="w-20 h-20 rounded-full ring-2 ring-zinc-700"
            />
            <div className="space-y-2">
              <Label htmlFor="avatar-upload" className="text-white">
                Alterar Avatar
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="text-sm bg-zinc-700 border-zinc-600 text-white"
              />
            </div>
          </div>

          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="nickname" className="text-white">
              Nickname
            </Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Seu nickname"
              className="bg-zinc-700 border-zinc-600 text-white"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-white">
              Biografia
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre você..."
              rows={3}
              className="bg-zinc-700 border-zinc-600 text-white"
            />
          </div>

          {/* User Info */}
          <div className="space-y-2 text-sm text-zinc-400">
            <p className="text-white">
              <strong>Email:</strong> {user.email || "Não informado"}
            </p>
            <p className="text-white">
              <strong>Tipo:</strong> {user.isGuest ? "Convidado" : "Usuário Registrado"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button onClick={handleSave} className="flex-1 bg-zinc-600 hover:bg-zinc-500">
              Salvar
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
