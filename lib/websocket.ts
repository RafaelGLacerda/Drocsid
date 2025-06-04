import type { User, Message } from "@/types"

export interface WebSocketMessage {
  type:
    | "user_join"
    | "user_leave"
    | "users_online"
    | "message_send"
    | "voice_join"
    | "voice_leave"
    | "voice_state"
    | "server_join"
    | "server_create"
    | "server_data"
    | "server_member_join"
    | "typing_start"
    | "typing_stop"
    | "invite_create"
    | "invite_created"
    | "invite_use"
    | "invite_success"
    | "invite_error"
    | "invite_update"
    | "voice_data"
    | "voice_offer"
    | "voice_answer"
    | "voice_ice_candidate"
  data: any
  userId?: string
  timestamp?: Date
}

export interface VoiceState {
  userId: string
  channelId: string
  isMuted: boolean
  isDeafened: boolean
  isSpeaking: boolean
}

export interface OnlineUser {
  id: string
  nickname: string
  avatar: string
  status: "online" | "away" | "busy" | "offline"
  lastSeen: Date
}

class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false
  private messageQueue: WebSocketMessage[] = []
  private listeners: Map<string, Function[]> = new Map()
  private currentUser: User | null = null
  private isUsingFallback = false

  // Fallback usando localStorage + polling + BroadcastChannel para comunicação entre abas/dispositivos
  private pollInterval: NodeJS.Timeout | null = null
  private lastMessageId = 0
  private broadcastChannel: BroadcastChannel | null = null

  constructor() {
    if (typeof window !== "undefined") {
      // Usar BroadcastChannel para comunicação entre abas/dispositivos na mesma origem
      this.broadcastChannel = new BroadcastChannel("drocsid-realtime")
      this.broadcastChannel.onmessage = this.handleBroadcastMessage.bind(this)

      // Escutar eventos de storage para comunicação entre diferentes origens
      window.addEventListener("storage", this.handleStorageEvent.bind(this))
      window.addEventListener("beforeunload", this.cleanup.bind(this))
    }
  }

  private handleBroadcastMessage(event: MessageEvent) {
    if (!this.isUsingFallback) return

    try {
      const message = event.data as WebSocketMessage
      if (message.userId !== this.currentUser?.id) {
        this.emit(message.type, message.data)
      }
    } catch (error) {
      console.error("Error handling broadcast message:", error)
    }
  }

  private handleStorageEvent(event: StorageEvent) {
    if (!this.isUsingFallback) return

    if (event.key === "drocsid-realtime-messages") {
      try {
        const messages = JSON.parse(event.newValue || "[]") as WebSocketMessage[]
        const newMessages = messages.filter(
          (msg) => msg.timestamp && new Date(msg.timestamp).getTime() > this.lastMessageId,
        )

        newMessages.forEach((message) => {
          if (message.userId !== this.currentUser?.id) {
            this.emit(message.type, message.data)
          }
        })

        if (newMessages.length > 0) {
          this.lastMessageId = Math.max(...newMessages.map((msg) => new Date(msg.timestamp!).getTime()))
        }
      } catch (error) {
        console.error("Error parsing storage message:", error)
      }
    }
  }

  connect(user: User) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return
    }

    this.currentUser = user
    this.isConnecting = true

    // Tentar conectar via WebSocket primeiro
    this.tryWebSocketConnection(user)
  }

  private async tryWebSocketConnection(user: User) {
    try {
      // Detectar automaticamente a URL do WebSocket baseada no ambiente
      const wsUrl = this.getWebSocketUrl()

      console.log("🔌 Tentando conectar WebSocket:", wsUrl)
      this.ws = new WebSocket(wsUrl)

      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log("⏰ Timeout na conexão WebSocket, usando fallback")
          this.ws.close()
          this.fallbackToLocalStorage(user)
        }
      }, 5000)

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout)
        console.log("✅ Conectado ao servidor WebSocket")
        this.isConnecting = false
        this.isUsingFallback = false
        this.reconnectAttempts = 0
        this.emit("connected")
        this.processMessageQueue()

        this.send({
          type: "user_join",
          data: { user },
          userId: user.id,
          timestamp: new Date(),
        })
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.emit(message.type, message.data)
        } catch (error) {
          console.error("❌ Erro ao processar mensagem:", error)
        }
      }

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout)
        console.log("🔌 Conexão WebSocket fechada:", event.code)
        this.ws = null

        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect()
        } else {
          console.log("📱 Usando modo offline com localStorage + BroadcastChannel")
          this.fallbackToLocalStorage(user)
        }
      }

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout)
        console.log("❌ Erro WebSocket, usando fallback:", error)
        this.fallbackToLocalStorage(user)
      }
    } catch (error) {
      console.log("❌ Falha ao criar WebSocket, usando fallback:", error)
      this.fallbackToLocalStorage(user)
    }
  }

  private getWebSocketUrl(): string {
    if (typeof window === "undefined") return "ws://localhost:8080"

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = window.location.host

    // Para desenvolvimento local
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return "ws://localhost:8080"
    }

    // Para Vercel ou outros hosts, tentar usar a mesma URL com WebSocket
    // Como o Vercel não suporta WebSocket persistente, isso vai falhar e usar o fallback
    return `${protocol}//${host}/api/websocket`
  }

  private fallbackToLocalStorage(user: User) {
    console.log("📱 Iniciando modo offline com localStorage + BroadcastChannel")
    this.isUsingFallback = true
    this.isConnecting = false
    this.ws = null

    // Simular conexão bem-sucedida
    setTimeout(() => {
      this.emit("connected")
      this.addUserToOnlineList(user)
      this.startPolling()
      this.syncData()
    }, 500)
  }

  private addUserToOnlineList(user: User) {
    const onlineUsers = this.getStoredOnlineUsers()
    const existingUser = onlineUsers.find((u) => u.id === user.id)

    if (!existingUser) {
      onlineUsers.push({
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        status: "online",
        lastSeen: new Date(),
      })

      localStorage.setItem("drocsid-online-users", JSON.stringify(onlineUsers))

      // Notificar outras abas/dispositivos sobre novo usuário
      this.broadcastToAll({
        type: "user_join",
        data: { user },
        userId: user.id,
        timestamp: new Date(),
      })
    }
  }

  private startPolling() {
    if (this.pollInterval) return

    this.pollInterval = setInterval(() => {
      // Limpar usuários offline (mais de 30 segundos sem atividade)
      this.cleanupOfflineUsers()

      // Atualizar timestamp do usuário atual
      if (this.currentUser) {
        this.updateUserActivity(this.currentUser.id)
      }

      // Sincronizar dados entre dispositivos
      this.syncData()
    }, 5000) // Poll a cada 5 segundos para melhor responsividade
  }

  private syncData() {
    try {
      // Sincronizar convites
      const globalInvites = JSON.parse(localStorage.getItem("drocsid-global-invites") || "[]")
      const localInvites = JSON.parse(localStorage.getItem("drocsid-invites") || "[]")

      // Merge convites
      const allInvites = [...globalInvites, ...localInvites]
      const uniqueInvites = allInvites.filter(
        (invite, index, self) => index === self.findIndex((i) => i.code === invite.code),
      )

      localStorage.setItem("drocsid-global-invites", JSON.stringify(uniqueInvites))

      // Sincronizar servidores
      const globalServers = JSON.parse(localStorage.getItem("drocsid-global-servers") || "[]")
      const localServers = JSON.parse(localStorage.getItem("drocsid-servers") || "[]")

      // Merge servidores
      const allServers = [...globalServers, ...localServers]
      const uniqueServers = allServers.filter(
        (server, index, self) => index === self.findIndex((s) => s.id === server.id),
      )

      localStorage.setItem("drocsid-global-servers", JSON.stringify(uniqueServers))
    } catch (error) {
      console.error("Error syncing data:", error)
    }
  }

  private cleanupOfflineUsers() {
    const onlineUsers = this.getStoredOnlineUsers()
    const now = new Date()
    const thirtySecondsAgo = new Date(now.getTime() - 30000)

    const activeUsers = onlineUsers.filter((user) => {
      const lastSeen = new Date(user.lastSeen)
      return lastSeen > thirtySecondsAgo
    })

    if (activeUsers.length !== onlineUsers.length) {
      localStorage.setItem("drocsid-online-users", JSON.stringify(activeUsers))

      // Notificar sobre usuários que saíram
      const removedUsers = onlineUsers.filter((user) => !activeUsers.find((u) => u.id === user.id))
      removedUsers.forEach((user) => {
        this.emit("user_leave", { userId: user.id })
      })
    }
  }

  private updateUserActivity(userId: string) {
    const onlineUsers = this.getStoredOnlineUsers()
    const userIndex = onlineUsers.findIndex((u) => u.id === userId)

    if (userIndex >= 0) {
      onlineUsers[userIndex].lastSeen = new Date()
      localStorage.setItem("drocsid-online-users", JSON.stringify(onlineUsers))
    }
  }

  private getStoredOnlineUsers(): OnlineUser[] {
    try {
      const data = localStorage.getItem("drocsid-online-users")
      if (!data) return []

      const users = JSON.parse(data) as OnlineUser[]
      return users.map((user) => ({
        ...user,
        lastSeen: new Date(user.lastSeen),
      }))
    } catch {
      return []
    }
  }

  private broadcastToAll(message: WebSocketMessage) {
    try {
      // Broadcast via BroadcastChannel (mesma origem)
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(message)
      }

      // Broadcast via localStorage (diferentes origens)
      this.broadcastToStorage(message)
    } catch (error) {
      console.error("Error broadcasting message:", error)
    }
  }

  private broadcastToStorage(message: WebSocketMessage) {
    try {
      const messages = JSON.parse(localStorage.getItem("drocsid-realtime-messages") || "[]")
      messages.push(message)

      // Manter apenas as últimas 100 mensagens
      if (messages.length > 100) {
        messages.splice(0, messages.length - 100)
      }

      localStorage.setItem("drocsid-realtime-messages", JSON.stringify(messages))

      // Atualizar timestamp para polling
      if (message.timestamp) {
        this.lastMessageId = Math.max(this.lastMessageId, new Date(message.timestamp).getTime())
      }
    } catch (error) {
      console.error("Error broadcasting to storage:", error)
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.currentUser) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

      console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
      this.emit("reconnecting", this.reconnectAttempts)

      setTimeout(() => {
        if (this.currentUser && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
          this.tryWebSocketConnection(this.currentUser)
        }
      }, delay)
    } else {
      console.log("📱 Máximo de tentativas atingido, usando modo offline")
      if (this.currentUser) {
        this.fallbackToLocalStorage(this.currentUser)
      }
    }
  }

  disconnect() {
    this.cleanup()
  }

  private cleanup() {
    if (this.currentUser) {
      // Remover usuário da lista online
      const onlineUsers = this.getStoredOnlineUsers()
      const filteredUsers = onlineUsers.filter((u) => u.id !== this.currentUser!.id)
      localStorage.setItem("drocsid-online-users", JSON.stringify(filteredUsers))

      // Notificar outras abas/dispositivos
      this.broadcastToAll({
        type: "user_leave",
        data: { userId: this.currentUser.id },
        userId: this.currentUser.id,
        timestamp: new Date(),
      })
    }

    if (this.ws) {
      this.ws.close(1000, "Desconexão manual")
      this.ws = null
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close()
      this.broadcastChannel = null
    }

    this.currentUser = null
    this.isUsingFallback = false
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else if (this.isUsingFallback) {
      // Usar BroadcastChannel + localStorage como fallback
      this.broadcastToAll(message)

      // Emitir localmente para a aba atual
      setTimeout(() => {
        this.emit(message.type, message.data)
      }, 100)
    } else {
      this.messageQueue.push(message)
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message)
      }
    }
  }

  // Sistema de eventos
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)?.push(callback)
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(data))
    }
  }

  // Métodos específicos para diferentes tipos de mensagens
  sendMessage(message: Message, channelId: string) {
    this.send({
      type: "message_send",
      data: { message, channelId },
      userId: message.author.id,
      timestamp: new Date(),
    })
  }

  joinVoiceChannel(userId: string, channelId: string) {
    const voiceState: VoiceState = {
      userId,
      channelId,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
    }

    this.send({
      type: "voice_join",
      data: { voiceState },
      userId,
      timestamp: new Date(),
    })
  }

  leaveVoiceChannel(userId: string) {
    this.send({
      type: "voice_leave",
      data: { userId },
      userId,
      timestamp: new Date(),
    })
  }

  updateVoiceState(userId: string, state: Partial<VoiceState>) {
    this.send({
      type: "voice_state",
      data: { userId, state },
      userId,
      timestamp: new Date(),
    })
  }

  joinServer(serverId: string) {
    this.send({
      type: "server_join",
      data: { serverId },
      userId: this.currentUser?.id,
      timestamp: new Date(),
    })
  }

  createServer(server: any) {
    this.send({
      type: "server_create",
      data: { server },
      userId: this.currentUser?.id,
      timestamp: new Date(),
    })
  }

  startTyping(channelId: string) {
    this.send({
      type: "typing_start",
      data: { channelId },
      userId: this.currentUser?.id,
      timestamp: new Date(),
    })
  }

  stopTyping(channelId: string) {
    this.send({
      type: "typing_stop",
      data: { channelId },
      userId: this.currentUser?.id,
      timestamp: new Date(),
    })
  }

  createInvite(invite: any) {
    this.send({
      type: "invite_create",
      data: { invite },
      userId: this.currentUser?.id,
      timestamp: new Date(),
    })
  }

  useInvite(code: string, user: User) {
    this.send({
      type: "invite_use",
      data: { code, user },
      userId: user.id,
      timestamp: new Date(),
    })
  }

  // Novos métodos para melhor sincronização
  broadcastInviteUpdate(invites: any[]) {
    this.send({
      type: "invite_update",
      data: { invites },
      userId: this.currentUser?.id,
      timestamp: new Date(),
    })
  }

  notifyServerJoin(serverId: string, user: User) {
    this.send({
      type: "server_member_join",
      data: { serverId, user },
      userId: user.id,
      timestamp: new Date(),
    })
  }

  // Métodos para WebRTC (voz)
  sendVoiceOffer(targetUserId: string, offer: RTCSessionDescriptionInit) {
    this.send({
      type: "voice_offer",
      data: { targetUserId, offer },
      userId: this.currentUser?.id,
      timestamp: new Date(),
    })
  }

  sendVoiceAnswer(targetUserId: string, answer: RTCSessionDescriptionInit) {
    this.send({
      type: "voice_answer",
      data: { targetUserId, answer },
      userId: this.currentUser?.id,
      timestamp: new Date(),
    })
  }

  sendIceCandidate(targetUserId: string, candidate: RTCIceCandidateInit) {
    this.send({
      type: "voice_ice_candidate",
      data: { targetUserId, candidate },
      userId: this.currentUser?.id,
      timestamp: new Date(),
    })
  }

  // Getters para dados
  getOnlineUsers(): OnlineUser[] {
    if (this.isUsingFallback) {
      return this.getStoredOnlineUsers()
    }
    return []
  }

  getVoiceStates(): VoiceState[] {
    if (this.isUsingFallback) {
      try {
        const data = localStorage.getItem("drocsid-voice-states")
        return data ? JSON.parse(data) : []
      } catch {
        return []
      }
    }
    return []
  }

  // Status da conexão
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || this.isUsingFallback
  }

  get connectionState(): string {
    if (this.isUsingFallback) return "offline-mode"
    if (!this.ws) return "disconnected"

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting"
      case WebSocket.OPEN:
        return "connected"
      case WebSocket.CLOSING:
        return "closing"
      case WebSocket.CLOSED:
        return "disconnected"
      default:
        return "unknown"
    }
  }
}

// Singleton instance
export const wsManager = new WebSocketManager()
