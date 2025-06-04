"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Users, Hash, CheckCircle } from "lucide-react"
import { useInvite, syncInvites } from "@/lib/invite-system"
import type { User, Server } from "@/types"

interface JoinServerModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  onServerJoined: (server: Server) => void
}

export function JoinServerModal({ isOpen, onClose, user, onServerJoined }: JoinServerModalProps) {
  const [inviteCode, setInviteCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { invite } = useInvite()

  const handleJoinServer = async () => {
    if (!inviteCode.trim()) {
      setError("Digite um código de convite")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log("🚀 Iniciando processo de entrada no servidor...")

      // Sincronizar dados antes de tentar usar o convite
      syncInvites()

      const result = await invite(inviteCode.trim(), user)

      if (result.success && result.server) {
        console.log("✅ Entrada no servidor bem-sucedida!")
        setSuccess(`Você entrou no servidor "${result.server.name}" com sucesso!`)

        setTimeout(() => {
          onServerJoined(result.server!)
          setInviteCode("")
          setSuccess(null)
          onClose()
        }, 1500)
      } else {
        console.log("❌ Falha na entrada:", result.error)
        setError(result.error || "Erro desconhecido ao entrar no servidor")
      }
    } catch (error) {
      console.error("💥 Erro crítico:", error)
      setError("Erro interno. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (value: string) => {
    setInviteCode(value.toUpperCase()) // Converter para maiúsculo para consistência
    if (error) setError(null)
    if (success) setSuccess(null)
  }

  const handleClose = () => {
    setInviteCode("")
    setError(null)
    setSuccess(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-800 border-zinc-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Entrar em Servidor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hash className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-zinc-300 text-sm mb-4">Digite o código de convite para entrar em um servidor</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-code" className="text-zinc-300">
              Código de Convite
            </Label>
            <Input
              id="invite-code"
              value={inviteCode}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Ex: ABC123XY"
              className="bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400 text-center font-mono text-lg"
              onKeyPress={(e) => e.key === "Enter" && handleJoinServer()}
              autoFocus
              maxLength={8}
            />

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-2 rounded">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 p-2 rounded">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleJoinServer}
              disabled={!inviteCode.trim() || isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </div>
              ) : (
                "Entrar no Servidor"
              )}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              disabled={isLoading}
            >
              Cancelar
            </Button>
          </div>

          <div className="text-xs text-zinc-500 text-center space-y-1">
            <p>💡 Dica: Os códigos têm 8 caracteres (letras e números)</p>
            <p>⏰ Códigos de convite são válidos por 24 horas</p>
            <p>🔄 Funciona entre diferentes dispositivos e redes</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
