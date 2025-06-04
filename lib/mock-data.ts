import type { Server, Message, User } from "@/types"

export const mockUser: User = {
  id: "1",
  email: "user@example.com",
  nickname: "Usuario",
  avatar: "/placeholder.svg?height=40&width=40",
  bio: "Usuário do Drocsid",
  isGuest: false,
}

export const mockServers: Server[] = []

export const mockMessages: Message[] = [
  {
    id: "1",
    content: "Olá pessoal! Como estão?",
    author: {
      id: "2",
      email: "joao@example.com",
      nickname: "João123",
      avatar: "/placeholder.svg?height=40&width=40",
      bio: "Desenvolvedor",
      isGuest: false,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    channelId: "1",
  },
  {
    id: "2",
    content: "Tudo bem! Acabei de entrar no servidor 🎉",
    author: {
      id: "3",
      email: "maria@example.com",
      nickname: "Maria_Dev",
      avatar: "/placeholder.svg?height=40&width=40",
      bio: "Designer",
      isGuest: false,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 3),
    channelId: "1",
  },
  {
    id: "3",
    content: "Bem-vindos! Este é um ótimo lugar para conversar",
    author: mockUser,
    timestamp: new Date(Date.now() - 1000 * 60 * 1),
    channelId: "1",
  },
]
