"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Hash, MoreVertical, LogOut, Trash2, Users, UserPlus, UserCheck } from "lucide-react"
import { ServerInviteModal } from "@/components/server-invite-modal"
import { JoinServerModal } from "@/components/join-server-modal"
import type { Server, User } from "@/types"

interface ServerListProps {
  servers: Server[]
  selectedServer: Server | null
  onSelectServer: (server: Server) => void
  onCreateServer: (name: string) => void
  onLeaveServer: (serverId: string) => void
  onDeleteServer: (serverId: string) => void
  onServerJoined: (server: Server) => void
  currentUser: User
  onOpenFriends: () => void
}

export function ServerList({
  servers,
  selectedServer,
  onSelectServer,
  onCreateServer,
  onLeaveServer,
  onDeleteServer,
  onServerJoined,
  currentUser,
  onOpenFriends,
}: ServerListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isJoinOpen, setIsJoinOpen] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [serverName, setServerName] = useState("")
  const [inviteServer, setInviteServer] = useState<Server | null>(null)

  const handleCreateServer = () => {
    if (serverName.trim()) {
      onCreateServer(serverName.trim())
      setServerName("")
      setIsCreateOpen(false)
    }
  }

  const handleShowInvites = (server: Server) => {
    setInviteServer(server)
    setIsInviteOpen(true)
  }

  return (
    <>
      <div className="w-[72px] bg-zinc-800 flex flex-col items-center py-4 space-y-3 border-r border-zinc-700">
        {/* Friends Button */}
        <div
          className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-green-500 transition-all shadow-lg"
          onClick={onOpenFriends}
          title="Amigos"
        >
          <UserCheck className="w-6 h-6 text-white" />
        </div>

        {/* Home Button */}
        <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-all shadow-lg">
          <Hash className="w-6 h-6 text-white" />
        </div>

        {servers.length > 0 && <div className="w-8 h-0.5 bg-zinc-700 rounded-full" />}

        {/* Server Icons */}
        {servers.map((server) => (
          <div key={server.id} className="relative group">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-lg ${
                selectedServer?.id === server.id ? "bg-zinc-600 rounded-xl" : "bg-zinc-700 hover:bg-zinc-600"
              }`}
              onClick={() => onSelectServer(server)}
            >
              {server.icon ? (
                <img
                  src={server.icon || "/placeholder.svg"}
                  alt={server.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-lg">{server.name.charAt(0).toUpperCase()}</span>
              )}
            </div>

            {/* Server Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -top-1 -right-1 w-6 h-6 p-0 bg-zinc-800 hover:bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-3 h-3 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-800 border-zinc-700" align="start">
                {server.ownerId === currentUser.id && (
                  <DropdownMenuItem
                    onClick={() => handleShowInvites(server)}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Gerenciar Convites
                  </DropdownMenuItem>
                )}
                {server.ownerId === currentUser.id ? (
                  <DropdownMenuItem
                    onClick={() => onDeleteServer(server.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Servidor
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => onLeaveServer(server.id)}
                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair do Servidor
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        {/* Add Server Button */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-all group shadow-lg">
              <Plus className="w-6 h-6 text-green-400 group-hover:text-white transition-colors" />
            </div>
          </DialogTrigger>
          <DialogContent className="bg-zinc-800 border-zinc-700">
            <DialogHeader>
              <DialogTitle className="text-white text-center">Adicionar Servidor</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-700">
                <TabsTrigger value="create" className="data-[state=active]:bg-zinc-600">
                  Criar Servidor
                </TabsTrigger>
                <TabsTrigger value="join" className="data-[state=active]:bg-zinc-600">
                  Entrar com Código
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Hash className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="text-zinc-300 text-sm mb-4">Crie seu próprio servidor e convide amigos</p>
                </div>
                <Input
                  placeholder="Nome do servidor"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCreateServer()}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  autoFocus
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleCreateServer}
                    disabled={!serverName.trim()}
                    className="flex-1 bg-zinc-600 hover:bg-zinc-500"
                  >
                    Criar Servidor
                  </Button>
                  <Button
                    onClick={() => setIsCreateOpen(false)}
                    variant="outline"
                    className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                  >
                    Cancelar
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="join" className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="text-zinc-300 text-sm mb-4">Entre em um servidor usando um código de convite</p>
                </div>
                <Button
                  onClick={() => {
                    setIsCreateOpen(false)
                    setIsJoinOpen(true)
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Entrar com Código
                </Button>
                <Button
                  onClick={() => setIsCreateOpen(false)}
                  variant="outline"
                  className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancelar
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Join Server Modal */}
      <JoinServerModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        user={currentUser}
        onServerJoined={onServerJoined}
      />

      {/* Server Invite Modal */}
      {inviteServer && (
        <ServerInviteModal
          isOpen={isInviteOpen}
          onClose={() => {
            setIsInviteOpen(false)
            setInviteServer(null)
          }}
          server={inviteServer}
          user={currentUser}
        />
      )}
    </>
  )
}
