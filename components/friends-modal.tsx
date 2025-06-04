"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, Search, Check, X, MessageCircle, UserMinus, Clock, UserCheck } from "lucide-react"
import {
  searchUsersByNickname,
  sendFriendRequest,
  getPendingFriendRequests,
  getSentFriendRequests,
  respondToFriendRequest,
  loadFriends,
  removeFriend,
  type FriendRequest,
  type Friend,
} from "@/lib/friends-system"
import type { User } from "@/types"

interface FriendsModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  onlineUsers: Array<{ id: string; nickname: string; avatar: string; status: string }>
}

export function FriendsModal({ isOpen, onClose, user, onlineUsers }: FriendsModalProps) {
  const [activeTab, setActiveTab] = useState("friends")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, user.id])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        setIsSearching(true)
        const results = searchUsersByNickname(searchQuery, user.id)
        setSearchResults(results)
        setIsSearching(false)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, user.id])

  const loadData = () => {
    setFriends(loadFriends(user.id))
    setPendingRequests(getPendingFriendRequests(user.id))
    setSentRequests(getSentFriendRequests(user.id))
  }

  const handleSendFriendRequest = (targetUser: User) => {
    const result = sendFriendRequest(user, targetUser)
    if (result.success) {
      setSearchQuery("")
      setSearchResults([])
      loadData()
    } else {
      alert(result.error)
    }
  }

  const handleRespondToRequest = (requestId: string, response: "accepted" | "rejected") => {
    const result = respondToFriendRequest(requestId, response, user.id)
    if (result.success) {
      loadData()
    } else {
      alert(result.error)
    }
  }

  const handleRemoveFriend = (friendId: string) => {
    if (confirm("Tem certeza que deseja remover este amigo?")) {
      removeFriend(user.id, friendId)
      loadData()
    }
  }

  const getFriendStatus = (friendId: string) => {
    const onlineUser = onlineUsers.find((u) => u.id === friendId)
    return onlineUser?.status || "offline"
  }

  const getStatusColor = (status: string) => {
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

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "Online"
      case "away":
        return "Ausente"
      case "busy":
        return "Ocupado"
      default:
        return "Offline"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-800 border-zinc-700 max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Amigos
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-zinc-700">
            <TabsTrigger value="friends" className="data-[state=active]:bg-zinc-600">
              <UserCheck className="w-4 h-4 mr-2" />
              Amigos ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="data-[state=active]:bg-zinc-600">
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-zinc-600">
              <Clock className="w-4 h-4 mr-2" />
              Pendentes ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="data-[state=active]:bg-zinc-600">
              <UserPlus className="w-4 h-4 mr-2" />
              Enviadas ({sentRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* Lista de Amigos */}
          <TabsContent value="friends" className="space-y-4 max-h-96 overflow-y-auto">
            {friends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400">Você ainda não tem amigos</p>
                <p className="text-zinc-500 text-sm">Use a aba "Adicionar" para encontrar pessoas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => {
                  const status = getFriendStatus(friend.user.id)
                  return (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-3 bg-zinc-700 rounded-lg hover:bg-zinc-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={friend.user.avatar || "/placeholder.svg"}
                            alt={friend.user.nickname}
                            className="w-10 h-10 rounded-full"
                          />
                          <div
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-700 ${getStatusColor(status)}`}
                          />
                        </div>
                        <div>
                          <p className="text-white font-medium">{friend.user.nickname}</p>
                          <p className="text-xs text-zinc-400">{getStatusText(status)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveFriend(friend.user.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Adicionar Amigos */}
          <TabsContent value="add" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nickname..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-700 border-zinc-600 text-white"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {isSearching ? (
                <div className="text-center py-4">
                  <p className="text-zinc-400">Buscando...</p>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((searchUser) => (
                  <div
                    key={searchUser.id}
                    className="flex items-center justify-between p-3 bg-zinc-700 rounded-lg hover:bg-zinc-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={searchUser.avatar || "/placeholder.svg"}
                        alt={searchUser.nickname}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="text-white font-medium">{searchUser.nickname}</p>
                        <p className="text-xs text-zinc-400">
                          {searchUser.isGuest ? "Usuário Convidado" : "Usuário Registrado"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSendFriendRequest(searchUser)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                ))
              ) : searchQuery.trim() ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-400">Nenhum usuário encontrado</p>
                  <p className="text-zinc-500 text-sm">Tente buscar por outro nickname</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserPlus className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-400">Digite um nickname para buscar</p>
                  <p className="text-zinc-500 text-sm">Encontre pessoas pelo nome de usuário</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Solicitações Pendentes */}
          <TabsContent value="pending" className="space-y-4 max-h-96 overflow-y-auto">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400">Nenhuma solicitação pendente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-zinc-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src={request.fromUser.avatar || "/placeholder.svg"}
                        alt={request.fromUser.nickname}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="text-white font-medium">{request.fromUser.nickname}</p>
                        <p className="text-xs text-zinc-400">Enviado em {request.createdAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRespondToRequest(request.id, "accepted")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRespondToRequest(request.id, "rejected")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Solicitações Enviadas */}
          <TabsContent value="sent" className="space-y-4 max-h-96 overflow-y-auto">
            {sentRequests.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400">Nenhuma solicitação enviada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-zinc-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src={request.toUser.avatar || "/placeholder.svg"}
                        alt={request.toUser.nickname}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="text-white font-medium">{request.toUser.nickname}</p>
                        <p className="text-xs text-zinc-400">Enviado em {request.createdAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-amber-600 text-white">
                      <Clock className="w-3 h-3 mr-1" />
                      Pendente
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
