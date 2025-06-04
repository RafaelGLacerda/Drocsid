import type { User, Server, Message, Settings } from "@/types"

// Chaves para armazenamento no localStorage
const STORAGE_KEYS = {
  USER: "drocsid-user",
  SERVERS: "drocsid-servers",
  MESSAGES: "drocsid-messages",
  SETTINGS: "drocsid-settings",
}

// Funções para salvar dados
export const saveUser = (user: User): void => {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
}

export const saveServers = (servers: Server[]): void => {
  localStorage.setItem(STORAGE_KEYS.SERVERS, JSON.stringify(servers))
}

export const saveMessages = (messages: Message[]): void => {
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages))
}

export const saveSettings = (settings: Settings): void => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
}

// Funções para carregar dados
export const loadUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.USER)
  return data ? JSON.parse(data) : null
}

export const loadServers = (): Server[] => {
  const data = localStorage.getItem(STORAGE_KEYS.SERVERS)
  if (!data) return []

  // Converte as datas de string para objetos Date
  const servers = JSON.parse(data) as Server[]
  return servers
}

export const loadMessages = (): Message[] => {
  const data = localStorage.getItem(STORAGE_KEYS.MESSAGES)
  if (!data) return []

  // Converte as datas de string para objetos Date
  const messages = JSON.parse(data) as Message[]
  messages.forEach((msg) => {
    msg.timestamp = new Date(msg.timestamp)
  })

  return messages
}

export const loadSettings = (): Settings => {
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS)
  if (!data) {
    // Configurações padrão
    return {
      theme: "dark",
      audioSettings: {
        masterVolume: 1.0,
        userVolumes: {},
        voiceSensitivity: 15,
      },
    }
  }

  return JSON.parse(data)
}

// Função para limpar todos os dados
export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.USER)
  localStorage.removeItem(STORAGE_KEYS.SERVERS)
  localStorage.removeItem(STORAGE_KEYS.MESSAGES)
  localStorage.removeItem(STORAGE_KEYS.SETTINGS)
}
