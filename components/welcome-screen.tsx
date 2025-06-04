"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Users, MessageCircle } from "lucide-react"

interface WelcomeScreenProps {
  onCreateServer: (name: string) => void
}

export function WelcomeScreen({ onCreateServer }: WelcomeScreenProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [serverName, setServerName] = useState("")

  const handleCreateServer = () => {
    if (serverName.trim()) {
      onCreateServer(serverName.trim())
      setServerName("")
      setIsCreateOpen(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md space-y-8">
        <div className="space-y-4">
          <div className="mx-auto w-24 h-24 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl">
            <MessageCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Bem-vindo ao Drocsid
          </h1>
          <p className="text-white/70 text-lg">
            Crie seu primeiro servidor para começar a conversar com amigos e comunidades
          </p>
        </div>

        <div className="space-y-4">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold py-4 rounded-xl shadow-lg text-lg">
                <Plus className="w-5 h-5 mr-2" />
                Criar Meu Primeiro Servidor
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900/95 backdrop-blur-lg border-purple-500/20">
              <DialogHeader>
                <DialogTitle className="text-white text-center">Criar Novo Servidor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Input
                    placeholder="Nome do servidor"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleCreateServer()}
                    className="bg-slate-800 border-purple-500/20 text-white"
                    autoFocus
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleCreateServer}
                    disabled={!serverName.trim()}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
                  >
                    Criar Servidor
                  </Button>
                  <Button
                    onClick={() => setIsCreateOpen(false)}
                    variant="outline"
                    className="flex-1 border-purple-500/20 text-slate-300 hover:bg-slate-800"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-2 gap-4 text-sm text-white/60">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Convide amigos</span>
            </div>
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>Chat em tempo real</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
