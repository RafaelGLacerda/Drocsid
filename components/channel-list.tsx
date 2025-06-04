"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Hash, Volume2, Plus, ChevronDown } from "lucide-react"
import type { Server, Channel } from "@/types"

interface ChannelListProps {
  server: Server
  selectedChannel: Channel | null
  onSelectChannel: (channel: Channel) => void
  onCreateChannel: (name: string, type: "text" | "voice") => void
}

export function ChannelList({ server, selectedChannel, onSelectChannel, onCreateChannel }: ChannelListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [channelName, setChannelName] = useState("")
  const [channelType, setChannelType] = useState<"text" | "voice">("text")

  const handleCreateChannel = () => {
    if (channelName.trim()) {
      onCreateChannel(channelName.trim(), channelType)
      setChannelName("")
      setIsCreateOpen(false)
    }
  }

  const textChannels = server.channels.filter((c) => c.type === "text")
  const voiceChannels = server.channels.filter((c) => c.type === "voice")

  return (
    <div className="w-60 bg-zinc-800 flex flex-col border-r border-zinc-700">
      {/* Server Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-700 shadow-sm bg-zinc-800">
        <h2 className="text-white font-semibold truncate">{server.name}</h2>
        <ChevronDown className="w-4 h-4 text-zinc-400" />
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Text Channels */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Canais de Texto</span>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-4 h-4 p-0 text-zinc-400 hover:text-zinc-300"
                  onClick={() => setChannelType("text")}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-800 border-zinc-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Criar Canal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={channelType} onValueChange={(value: "text" | "voice") => setChannelType(value)}>
                    <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-700 border-zinc-600">
                      <SelectItem value="text">Canal de Texto</SelectItem>
                      <SelectItem value="voice">Canal de Voz</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Nome do canal"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleCreateChannel()}
                    className="bg-zinc-700 border-zinc-600 text-white"
                  />
                  <Button onClick={handleCreateChannel} className="w-full bg-zinc-600 hover:bg-zinc-500">
                    Criar Canal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {textChannels.map((channel) => (
            <div
              key={channel.id}
              className={`flex items-center px-2 py-1 mx-2 rounded cursor-pointer transition-all ${
                selectedChannel?.id === channel.id
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:bg-zinc-700/50 hover:text-white"
              }`}
              onClick={() => onSelectChannel(channel)}
            >
              <Hash className="w-4 h-4 mr-2" />
              <span className="text-sm">{channel.name}</span>
            </div>
          ))}
        </div>

        {/* Voice Channels */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Canais de Voz</span>
            <Button
              variant="ghost"
              size="sm"
              className="w-4 h-4 p-0 text-zinc-400 hover:text-zinc-300"
              onClick={() => {
                setChannelType("voice")
                setIsCreateOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {voiceChannels.map((channel) => (
            <div
              key={channel.id}
              className={`flex items-center px-2 py-1 mx-2 rounded cursor-pointer transition-all ${
                selectedChannel?.id === channel.id
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:bg-zinc-700/50 hover:text-white"
              }`}
              onClick={() => onSelectChannel(channel)}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              <span className="text-sm">{channel.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
