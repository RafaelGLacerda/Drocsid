export interface User {
  id: string
  email: string
  nickname: string
  avatar: string
  bio: string
  isGuest: boolean
}

export interface Server {
  id: string
  name: string
  icon: string
  channels: Channel[]
  members: User[]
  ownerId: string
  inviteCode?: string
  inviteExpiry?: Date
}

export interface Channel {
  id: string
  name: string
  type: "text" | "voice"
  serverId: string
}

export interface Message {
  id: string
  content: string
  author: User
  timestamp: Date
  channelId: string
}

export interface AudioSettings {
  masterVolume: number
  userVolumes: Record<string, number>
  voiceSensitivity: number
}

export interface Settings {
  theme: "dark" | "light"
  audioSettings: AudioSettings
}

export interface VoiceUser {
  id: string
  nickname: string
  avatar: string
  isMuted: boolean
  isSpeaking: boolean
  volume: number
}

export interface ServerInvite {
  code: string
  serverId: string
  serverName: string
  createdBy: string
  createdAt: Date
  expiresAt: Date
  uses: number
  maxUses?: number
}

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
