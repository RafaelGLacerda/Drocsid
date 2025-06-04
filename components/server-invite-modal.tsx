"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check, Users, Clock, Hash } from "lucide-react"
import { createInvite, getServerInvites } from "@/lib/invite-system"
import type { Server, User, ServerInvite } from "@/types"

interface ServerInviteModalProps {
  isOpen: boolean
  onClose: () => void
  server: Server
  user: User
}

export function ServerInviteModal({ isOpen, onClose, server, user }: ServerInviteModalProps) {
  const [invites, setInvites] = useState<ServerInvite[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadInvites()
    }
  }, [isOpen, server.id])

  const loadInvites = () => {
    const serverInvites = getServerInvites(server.id)
    setInvites(serverInvites)
  }

  const handleCreateInvite = () => {
    const newInvite = createInvite(server, user.id)
    setInvites((prev) => [newInvite, ...prev])
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      console.error("Erro ao copiar código:", error)
    }
  }

  const formatTimeRemaining = (expiresAt: Date): string => {
    const now = new Date()
    const diff = expiresAt.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-800 border-zinc-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Convites do Servidor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-zinc-300 text-sm mb-4">
              Convide pessoas para <span className="font-semibold text-white">{server.name}</span>
            </p>
            <Button onClick={handleCreateInvite} className="w-full bg-zinc-600 hover:bg-zinc-500">
              Gerar Novo Convite
            </Button>
          </div>

          {invites.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-white font-medium text-sm">Convites Ativos</h4>
              {invites.map((invite) => (
                <div key={invite.code} className="bg-zinc-700 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-zinc-400" />
                      <code className="text-white font-mono text-sm bg-zinc-600 px-2 py-1 rounded">{invite.code}</code>
                    </div>
                    <Button
                      onClick={() => handleCopyCode(invite.code)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                    >
                      {copiedCode === invite.code ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{invite.uses} usos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Expira em {formatTimeRemaining(invite.expiresAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {invites.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">Nenhum convite ativo</p>
              <p className="text-zinc-500 text-xs">Gere um convite para começar</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
