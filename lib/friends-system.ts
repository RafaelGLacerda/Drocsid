import type { User } from "@/types"

export interface FriendRequest {
  id: string
  fromUserId: string
  toUserId: string
  fromUser: User
  toUser: User
  status: "pending" | "accepted" | "rejected"
  createdAt: Date
}

export interface Friend {
  id: string
  user: User
  addedAt: Date
  status: "online" | "offline" | "away" | "busy"
}

// Gerenciar usuários registrados globalmente
export const saveRegisteredUser = (user: User): void => {
  try {
    const registeredUsers = getRegisteredUsers()
    const existingIndex = registeredUsers.findIndex((u) => u.id === user.id)

    if (existingIndex >= 0) {
      registeredUsers[existingIndex] = user
    } else {
      registeredUsers.push(user)
    }

    localStorage.setItem("drocsid-registered-users", JSON.stringify(registeredUsers))
  } catch (error) {
    console.error("Error saving registered user:", error)
  }
}

export const getRegisteredUsers = (): User[] => {
  try {
    const data = localStorage.getItem("drocsid-registered-users")
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error("Error loading registered users:", error)
    return []
  }
}

export const isNicknameAvailable = (nickname: string, excludeUserId?: string): boolean => {
  const registeredUsers = getRegisteredUsers()
  return !registeredUsers.some(
    (user) => user.nickname.toLowerCase() === nickname.toLowerCase() && user.id !== excludeUserId,
  )
}

export const searchUsersByNickname = (query: string, currentUserId: string): User[] => {
  if (!query.trim()) return []

  const registeredUsers = getRegisteredUsers()
  const queryLower = query.toLowerCase()

  return registeredUsers
    .filter((user) => user.id !== currentUserId && user.nickname.toLowerCase().includes(queryLower))
    .slice(0, 10) // Limitar a 10 resultados
}

// Gerenciar solicitações de amizade
export const saveFriendRequests = (requests: FriendRequest[]): void => {
  try {
    localStorage.setItem("drocsid-friend-requests", JSON.stringify(requests))
  } catch (error) {
    console.error("Error saving friend requests:", error)
  }
}

export const loadFriendRequests = (): FriendRequest[] => {
  try {
    const data = localStorage.getItem("drocsid-friend-requests")
    if (!data) return []

    const requests = JSON.parse(data) as FriendRequest[]
    return requests.map((req) => ({
      ...req,
      createdAt: new Date(req.createdAt),
    }))
  } catch (error) {
    console.error("Error loading friend requests:", error)
    return []
  }
}

export const sendFriendRequest = (fromUser: User, toUser: User): { success: boolean; error?: string } => {
  const requests = loadFriendRequests()

  // Verificar se já existe uma solicitação pendente
  const existingRequest = requests.find(
    (req) =>
      ((req.fromUserId === fromUser.id && req.toUserId === toUser.id) ||
        (req.fromUserId === toUser.id && req.toUserId === fromUser.id)) &&
      req.status === "pending",
  )

  if (existingRequest) {
    return { success: false, error: "Já existe uma solicitação pendente com este usuário" }
  }

  // Verificar se já são amigos
  const friends = loadFriends(fromUser.id)
  const isAlreadyFriend = friends.some((friend) => friend.user.id === toUser.id)

  if (isAlreadyFriend) {
    return { success: false, error: "Vocês já são amigos" }
  }

  // Criar nova solicitação
  const newRequest: FriendRequest = {
    id: Date.now().toString(),
    fromUserId: fromUser.id,
    toUserId: toUser.id,
    fromUser,
    toUser,
    status: "pending",
    createdAt: new Date(),
  }

  requests.push(newRequest)
  saveFriendRequests(requests)

  return { success: true }
}

export const respondToFriendRequest = (
  requestId: string,
  response: "accepted" | "rejected",
  currentUserId: string,
): { success: boolean; error?: string } => {
  const requests = loadFriendRequests()
  const requestIndex = requests.findIndex((req) => req.id === requestId)

  if (requestIndex === -1) {
    return { success: false, error: "Solicitação não encontrada" }
  }

  const request = requests[requestIndex]

  if (request.toUserId !== currentUserId) {
    return { success: false, error: "Você não pode responder a esta solicitação" }
  }

  requests[requestIndex].status = response
  saveFriendRequests(requests)

  // Se aceita, adicionar aos amigos
  if (response === "accepted") {
    addFriend(request.fromUser, request.toUser)
    addFriend(request.toUser, request.fromUser)
  }

  return { success: true }
}

export const getPendingFriendRequests = (userId: string): FriendRequest[] => {
  const requests = loadFriendRequests()
  return requests.filter((req) => req.toUserId === userId && req.status === "pending")
}

export const getSentFriendRequests = (userId: string): FriendRequest[] => {
  const requests = loadFriendRequests()
  return requests.filter((req) => req.fromUserId === userId && req.status === "pending")
}

// Gerenciar amigos
export const saveFriends = (userId: string, friends: Friend[]): void => {
  try {
    localStorage.setItem(`drocsid-friends-${userId}`, JSON.stringify(friends))
  } catch (error) {
    console.error("Error saving friends:", error)
  }
}

export const loadFriends = (userId: string): Friend[] => {
  try {
    const data = localStorage.getItem(`drocsid-friends-${userId}`)
    if (!data) return []

    const friends = JSON.parse(data) as Friend[]
    return friends.map((friend) => ({
      ...friend,
      addedAt: new Date(friend.addedAt),
    }))
  } catch (error) {
    console.error("Error loading friends:", error)
    return []
  }
}

const addFriend = (user: User, friendUser: User): void => {
  const friends = loadFriends(user.id)

  const existingFriend = friends.find((f) => f.user.id === friendUser.id)
  if (existingFriend) return

  const newFriend: Friend = {
    id: Date.now().toString(),
    user: friendUser,
    addedAt: new Date(),
    status: "offline",
  }

  friends.push(newFriend)
  saveFriends(user.id, friends)
}

export const removeFriend = (userId: string, friendId: string): void => {
  const friends = loadFriends(userId)
  const filteredFriends = friends.filter((f) => f.user.id !== friendId)
  saveFriends(userId, filteredFriends)

  // Remover também da lista do amigo
  const friendFriends = loadFriends(friendId)
  const filteredFriendFriends = friendFriends.filter((f) => f.user.id !== userId)
  saveFriends(friendId, filteredFriendFriends)
}

export const updateFriendStatus = (userId: string, friendId: string, status: Friend["status"]): void => {
  const friends = loadFriends(userId)
  const friendIndex = friends.findIndex((f) => f.user.id === friendId)

  if (friendIndex >= 0) {
    friends[friendIndex].status = status
    saveFriends(userId, friends)
  }
}
