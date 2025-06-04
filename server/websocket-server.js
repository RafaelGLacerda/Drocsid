const WebSocket = require("ws")
const http = require("http")
const express = require("express")
const cors = require("cors")

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

// Armazenamento em memória (em produção, use um banco de dados)
const connectedUsers = new Map()
const servers = new Map()
const messages = new Map()
const voiceStates = new Map()
const invites = new Map()

// Função para broadcast para todos os clientes conectados
function broadcast(message, excludeUserId = null) {
  const messageStr = JSON.stringify(message)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const clientUserId = client.userId
      if (!excludeUserId || clientUserId !== excludeUserId) {
        client.send(messageStr)
      }
    }
  })
}

// Função para enviar mensagem para usuários específicos de um servidor
function broadcastToServer(serverId, message, excludeUserId = null) {
  const server = servers.get(serverId)
  if (!server) return

  const messageStr = JSON.stringify(message)
  server.members.forEach((memberId) => {
    if (memberId !== excludeUserId) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.userId === memberId) {
          client.send(messageStr)
        }
      })
    }
  })
}

wss.on("connection", (ws) => {
  console.log("Nova conexão WebSocket estabelecida")

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString())
      console.log("Mensagem recebida:", message.type)

      switch (message.type) {
        case "user_join":
          handleUserJoin(ws, message)
          break
        case "user_leave":
          handleUserLeave(ws, message)
          break
        case "message_send":
          handleMessageSend(ws, message)
          break
        case "voice_join":
          handleVoiceJoin(ws, message)
          break
        case "voice_leave":
          handleVoiceLeave(ws, message)
          break
        case "voice_state":
          handleVoiceState(ws, message)
          break
        case "server_join":
          handleServerJoin(ws, message)
          break
        case "server_create":
          handleServerCreate(ws, message)
          break
        case "typing_start":
          handleTypingStart(ws, message)
          break
        case "typing_stop":
          handleTypingStop(ws, message)
          break
        case "invite_create":
          handleInviteCreate(ws, message)
          break
        case "invite_use":
          handleInviteUse(ws, message)
          break
        default:
          console.log("Tipo de mensagem desconhecido:", message.type)
      }
    } catch (error) {
      console.error("Erro ao processar mensagem:", error)
    }
  })

  ws.on("close", () => {
    if (ws.userId) {
      handleUserDisconnect(ws)
    }
    console.log("Conexão WebSocket fechada")
  })

  ws.on("error", (error) => {
    console.error("Erro WebSocket:", error)
  })
})

function handleUserJoin(ws, message) {
  const { user } = message.data
  ws.userId = user.id
  ws.user = user

  connectedUsers.set(user.id, {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    status: "online",
    lastSeen: new Date(),
    ws: ws,
  })

  // Enviar lista de usuários online para o novo usuário
  ws.send(
    JSON.stringify({
      type: "users_online",
      data: {
        users: Array.from(connectedUsers.values()).map((u) => ({
          id: u.id,
          nickname: u.nickname,
          avatar: u.avatar,
          status: u.status,
          lastSeen: u.lastSeen,
        })),
      },
    }),
  )

  // Notificar outros usuários sobre a nova conexão
  broadcast(
    {
      type: "user_join",
      data: { user },
    },
    user.id,
  )

  console.log(`Usuário ${user.nickname} conectado`)
}

function handleUserLeave(ws, message) {
  if (ws.userId) {
    handleUserDisconnect(ws)
  }
}

function handleUserDisconnect(ws) {
  const userId = ws.userId
  if (!userId) return

  connectedUsers.delete(userId)
  voiceStates.delete(userId)

  broadcast(
    {
      type: "user_leave",
      data: { userId },
    },
    userId,
  )

  console.log(`Usuário ${userId} desconectado`)
}

function handleMessageSend(ws, message) {
  const { message: chatMessage, channelId } = message.data

  // Salvar mensagem
  if (!messages.has(channelId)) {
    messages.set(channelId, [])
  }
  messages.get(channelId).push(chatMessage)

  // Broadcast para usuários do servidor
  const serverId = getServerIdByChannelId(channelId)
  if (serverId) {
    broadcastToServer(serverId, {
      type: "message_send",
      data: { message: chatMessage, channelId },
    })
  }

  console.log(`Mensagem enviada no canal ${channelId}`)
}

function handleVoiceJoin(ws, message) {
  const { voiceState } = message.data
  voiceStates.set(voiceState.userId, voiceState)

  // Broadcast para usuários do servidor
  const serverId = getServerIdByChannelId(voiceState.channelId)
  if (serverId) {
    broadcastToServer(serverId, {
      type: "voice_join",
      data: { voiceState },
    })
  }

  console.log(`Usuário ${voiceState.userId} entrou no canal de voz ${voiceState.channelId}`)
}

function handleVoiceLeave(ws, message) {
  const { userId } = message.data
  const voiceState = voiceStates.get(userId)

  if (voiceState) {
    const serverId = getServerIdByChannelId(voiceState.channelId)
    voiceStates.delete(userId)

    if (serverId) {
      broadcastToServer(serverId, {
        type: "voice_leave",
        data: { userId },
      })
    }
  }

  console.log(`Usuário ${userId} saiu do canal de voz`)
}

function handleVoiceState(ws, message) {
  const { userId, state } = message.data
  const currentState = voiceStates.get(userId)

  if (currentState) {
    const updatedState = { ...currentState, ...state }
    voiceStates.set(userId, updatedState)

    const serverId = getServerIdByChannelId(currentState.channelId)
    if (serverId) {
      broadcastToServer(serverId, {
        type: "voice_state",
        data: { userId, state },
      })
    }
  }
}

function handleServerJoin(ws, message) {
  const { serverId } = message.data
  const server = servers.get(serverId)

  if (server && ws.userId) {
    if (!server.members.includes(ws.userId)) {
      server.members.push(ws.userId)
    }

    // Enviar dados do servidor para o usuário
    ws.send(
      JSON.stringify({
        type: "server_data",
        data: { server },
      }),
    )

    // Notificar outros membros
    broadcastToServer(
      serverId,
      {
        type: "server_member_join",
        data: { userId: ws.userId, serverId },
      },
      ws.userId,
    )
  }
}

function handleServerCreate(ws, message) {
  const { server } = message.data
  servers.set(server.id, server)

  console.log(`Servidor ${server.name} criado por ${ws.userId}`)
}

function handleTypingStart(ws, message) {
  const { channelId } = message.data
  const serverId = getServerIdByChannelId(channelId)

  if (serverId) {
    broadcastToServer(
      serverId,
      {
        type: "typing_start",
        data: { userId: ws.userId, channelId },
      },
      ws.userId,
    )
  }
}

function handleTypingStop(ws, message) {
  const { channelId } = message.data
  const serverId = getServerIdByChannelId(channelId)

  if (serverId) {
    broadcastToServer(
      serverId,
      {
        type: "typing_stop",
        data: { userId: ws.userId, channelId },
      },
      ws.userId,
    )
  }
}

function handleInviteCreate(ws, message) {
  const { invite } = message.data
  invites.set(invite.code, invite)

  ws.send(
    JSON.stringify({
      type: "invite_created",
      data: { invite },
    }),
  )

  console.log(`Convite ${invite.code} criado para servidor ${invite.serverId}`)
}

function handleInviteUse(ws, message) {
  const { code, user } = message.data
  const invite = invites.get(code)

  if (!invite) {
    ws.send(
      JSON.stringify({
        type: "invite_error",
        data: { error: "Código de convite inválido" },
      }),
    )
    return
  }

  if (new Date() > new Date(invite.expiresAt)) {
    ws.send(
      JSON.stringify({
        type: "invite_error",
        data: { error: "Código de convite expirado" },
      }),
    )
    return
  }

  const server = servers.get(invite.serverId)
  if (!server) {
    ws.send(
      JSON.stringify({
        type: "invite_error",
        data: { error: "Servidor não encontrado" },
      }),
    )
    return
  }

  if (server.members.includes(user.id)) {
    ws.send(
      JSON.stringify({
        type: "invite_error",
        data: { error: "Você já está neste servidor" },
      }),
    )
    return
  }

  // Adicionar usuário ao servidor
  server.members.push(user.id)
  invite.uses++

  ws.send(
    JSON.stringify({
      type: "invite_success",
      data: { server },
    }),
  )

  console.log(`Usuário ${user.nickname} entrou no servidor ${server.name} via convite`)
}

// Função auxiliar para encontrar servidor por canal
function getServerIdByChannelId(channelId) {
  for (const [serverId, server] of servers.entries()) {
    if (server.channels && server.channels.some((channel) => channel.id === channelId)) {
      return serverId
    }
  }
  return null
}

// API REST para dados iniciais
app.get("/api/servers", (req, res) => {
  res.json(Array.from(servers.values()))
})

app.get("/api/messages/:channelId", (req, res) => {
  const channelId = req.params.channelId
  const channelMessages = messages.get(channelId) || []
  res.json(channelMessages)
})

app.post("/api/servers", (req, res) => {
  const server = req.body
  servers.set(server.id, server)
  res.json(server)
})

const PORT = process.env.PORT || 8080
server.listen(PORT, () => {
  console.log(`🚀 Servidor WebSocket rodando na porta ${PORT}`)
  console.log(`📡 WebSocket URL: ws://localhost:${PORT}`)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Fechando servidor...")
  server.close(() => {
    console.log("Servidor fechado")
    process.exit(0)
  })
})
