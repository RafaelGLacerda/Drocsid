"use client"

import { Wifi, WifiOff, RotateCcw, Smartphone } from "lucide-react"

interface ConnectionStatusProps {
  isConnected: boolean
  isReconnecting: boolean
  reconnectAttempt: number
  connectionMode: "online" | "offline"
}

export function ConnectionStatus({
  isConnected,
  isReconnecting,
  reconnectAttempt,
  connectionMode,
}: ConnectionStatusProps) {
  if (isConnected && connectionMode === "online" && !isReconnecting) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-xs">
        <Wifi className="w-3 h-3" />
        <span>Online - Servidor Real</span>
      </div>
    )
  }

  if (isConnected && connectionMode === "offline") {
    return (
      <div className="flex items-center gap-2 text-blue-400 text-xs">
        <Smartphone className="w-3 h-3" />
        <span>Modo Offline - Funciona entre abas</span>
      </div>
    )
  }

  if (isReconnecting) {
    return (
      <div className="flex items-center gap-2 text-amber-400 text-xs">
        <RotateCcw className="w-3 h-3 animate-spin" />
        <span>Tentando conectar... ({reconnectAttempt}/5)</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-red-400 text-xs">
      <WifiOff className="w-3 h-3" />
      <span>Conectando...</span>
    </div>
  )
}
