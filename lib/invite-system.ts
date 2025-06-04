import type { Server, ServerInvite, User } from "@/types"
import { wsManager } from "@/lib/websocket"

// Gerar código de convite aleatório
export const generateInviteCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Salvar convites no localStorage com sincronização global
export const saveInvites = (invites: ServerInvite[]): void => {
  try {
    // Salvar localmente
    localStorage.setItem("drocsid-invites", JSON.stringify(invites))

    // Salvar globalmente para compartilhar entre usuários/dispositivos
    const globalInvites = JSON.parse(localStorage.getItem("drocsid-global-invites") || "[]")
    const mergedInvites = [...globalInvites]

    invites.forEach((invite) => {
      const existingIndex = mergedInvites.findIndex((i) => i.code === invite.code)
      if (existingIndex >= 0) {
        mergedInvites[existingIndex] = invite
      } else {
        mergedInvites.push(invite)
      }
    })

    localStorage.setItem("drocsid-global-invites", JSON.stringify(mergedInvites))

    // Broadcast via WebSocket/localStorage para outros usuários
    wsManager.broadcastInviteUpdate(invites)
  } catch (error) {
    console.error("Error saving invites:", error)
  }
}

// Carregar convites do localStorage com merge global
export const loadInvites = (): ServerInvite[] => {
  try {
    // Carregar convites globais primeiro
    const globalData = localStorage.getItem("drocsid-global-invites")
    const localData = localStorage.getItem("drocsid-invites")

    let allInvites: ServerInvite[] = []

    if (globalData) {
      const globalInvites = JSON.parse(globalData) as ServerInvite[]
      allInvites = [...globalInvites]
    }

    if (localData) {
      const localInvites = JSON.parse(localData) as ServerInvite[]
      localInvites.forEach((invite) => {
        const existingIndex = allInvites.findIndex((i) => i.code === invite.code)
        if (existingIndex >= 0) {
          allInvites[existingIndex] = invite
        } else {
          allInvites.push(invite)
        }
      })
    }

    // Converter datas de string para objetos Date
    allInvites.forEach((invite) => {
      invite.createdAt = new Date(invite.createdAt)
      invite.expiresAt = new Date(invite.expiresAt)
    })

    return allInvites
  } catch (error) {
    console.error("Error loading invites:", error)
    return []
  }
}

// Criar novo convite com sincronização global
export const createInvite = (server: Server, createdBy: string): ServerInvite => {
  const code = generateInviteCode()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 horas

  const invite: ServerInvite = {
    code,
    serverId: server.id,
    serverName: server.name,
    createdBy,
    createdAt: now,
    expiresAt,
    uses: 0,
    maxUses: 100,
  }

  const invites = loadInvites()
  invites.push(invite)
  saveInvites(invites)

  // Salvar o servidor também globalmente para que outros possam acessar
  saveServerGlobally(server)

  return invite
}

// Salvar servidor globalmente para acesso via convite
const saveServerGlobally = (server: Server): void => {
  try {
    const globalServers = JSON.parse(localStorage.getItem("drocsid-global-servers") || "[]") as Server[]
    const existingIndex = globalServers.findIndex((s) => s.id === server.id)

    if (existingIndex >= 0) {
      globalServers[existingIndex] = server
    } else {
      globalServers.push(server)
    }

    localStorage.setItem("drocsid-global-servers", JSON.stringify(globalServers))
  } catch (error) {
    console.error("Error saving server globally:", error)
  }
}

// Carregar servidor global
const loadServerGlobally = (serverId: string): Server | null => {
  try {
    const globalServers = JSON.parse(localStorage.getItem("drocsid-global-servers") || "[]") as Server[]
    return globalServers.find((s) => s.id === serverId) || null
  } catch (error) {
    console.error("Error loading server globally:", error)
    return null
  }
}

// Hook para usar convites com fallback automático melhorado
export const useInvite = () => {
  const invite = async (code: string, user: User): Promise<{ success: boolean; server?: Server; error?: string }> => {
    console.log("🔍 Tentando usar convite:", code)

    const invites = loadInvites()
    console.log("📋 Convites disponíveis:", invites.length)

    const inviteData = invites.find((inv) => inv.code.toLowerCase() === code.toLowerCase())

    if (!inviteData) {
      console.log("❌ Convite não encontrado")
      return { success: false, error: "Código de convite inválido ou expirado" }
    }

    console.log("✅ Convite encontrado:", inviteData)

    if (new Date() > inviteData.expiresAt) {
      console.log("⏰ Convite expirado")
      return { success: false, error: "Código de convite expirado" }
    }

    if (inviteData.maxUses && inviteData.uses >= inviteData.maxUses) {
      console.log("🚫 Convite esgotado")
      return { success: false, error: "Código de convite esgotado" }
    }

    // Tentar carregar servidor globalmente primeiro
    let server = loadServerGlobally(inviteData.serverId)

    if (!server) {
      // Se não encontrar globalmente, tentar nos servidores locais
      const localServers = JSON.parse(localStorage.getItem("drocsid-servers") || "[]") as Server[]
      server = localServers.find((s) => s.id === inviteData.serverId)
    }

    if (!server) {
      console.log("🏗️ Criando servidor básico")
      // Se o servidor não existe, criar uma versão básica
      server = {
        id: inviteData.serverId,
        name: inviteData.serverName,
        icon: "/placeholder.svg?height=48&width=48",
        channels: [
          {
            id: inviteData.serverId + "-general",
            name: "geral",
            type: "text",
            serverId: inviteData.serverId,
          },
          {
            id: inviteData.serverId + "-voice",
            name: "Sala de Voz",
            type: "voice",
            serverId: inviteData.serverId,
          },
        ],
        members: [],
        ownerId: inviteData.createdBy,
      }
    }

    // Verificar se o usuário já está no servidor
    if (server.members.some((member) => member.id === user.id)) {
      console.log("👥 Usuário já está no servidor")
      return { success: false, error: "Você já está neste servidor" }
    }

    console.log("➕ Adicionando usuário ao servidor")

    // Adicionar usuário ao servidor
    server.members.push(user)

    // Atualizar lista de servidores local
    const localServers = JSON.parse(localStorage.getItem("drocsid-servers") || "[]") as Server[]
    const serverIndex = localServers.findIndex((s) => s.id === server!.id)
    if (serverIndex >= 0) {
      localServers[serverIndex] = server
    } else {
      localServers.push(server)
    }

    localStorage.setItem("drocsid-servers", JSON.stringify(localServers))

    // Salvar servidor globalmente atualizado
    saveServerGlobally(server)

    // Incrementar uso do convite
    inviteData.uses++
    saveInvites(invites)

    // Notificar via WebSocket sobre novo membro
    wsManager.notifyServerJoin(server.id, user)

    console.log("🎉 Usuário entrou no servidor com sucesso")
    return { success: true, server }
  }

  return { invite }
}

// Limpar convites expirados
export const cleanExpiredInvites = (): void => {
  const invites = loadInvites()
  const now = new Date()
  const validInvites = invites.filter((invite) => invite.expiresAt > now)

  if (validInvites.length !== invites.length) {
    saveInvites(validInvites)
  }
}

// Obter convites de um servidor
export const getServerInvites = (serverId: string): ServerInvite[] => {
  const invites = loadInvites()
  return invites.filter((invite) => invite.serverId === serverId && invite.expiresAt > new Date())
}

// Sincronizar convites entre dispositivos
export const syncInvites = (): void => {
  try {
    const globalInvites = JSON.parse(localStorage.getItem("drocsid-global-invites") || "[]")
    const localInvites = JSON.parse(localStorage.getItem("drocsid-invites") || "[]")

    // Merge e salvar
    const mergedInvites = [...globalInvites, ...localInvites]
    const uniqueInvites = mergedInvites.filter(
      (invite, index, self) => index === self.findIndex((i) => i.code === invite.code),
    )

    localStorage.setItem("drocsid-global-invites", JSON.stringify(uniqueInvites))
    localStorage.setItem("drocsid-invites", JSON.stringify(uniqueInvites))
  } catch (error) {
    console.error("Error syncing invites:", error)
  }
}
