"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Volume2, Mic, MicOff, VolumeX, Headphones, Volume1, Volume, Settings, Users } from "lucide-react"
import { saveSettings, loadSettings } from "@/lib/storage"
import { wsManager } from "@/lib/websocket"
import type { Channel, User } from "@/types"

interface VoiceChatProps {
  channel: Channel
  user: User
  onJoinVoice?: () => void
  onLeaveVoice?: () => void
  onUpdateVoiceState?: (state: any) => void
  voiceUsers?: any[]
  onlineUsers?: any[]
}

export function VoiceChat({
  channel,
  user,
  onJoinVoice,
  onLeaveVoice,
  onUpdateVoiceState,
  voiceUsers = [],
  onlineUsers = [],
}: VoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [isSelfListening, setIsSelfListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [masterVolume, setMasterVolume] = useState(1.0)
  const [isVolumeControlOpen, setIsVolumeControlOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [voiceSensitivity, setVoiceSensitivity] = useState(15)
  const [connectedUsers, setConnectedUsers] = useState<any[]>([])

  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const selfListenGainRef = useRef<GainNode | null>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())

  // Configuração WebRTC
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  }

  // Carregar configurações de áudio
  useEffect(() => {
    const settings = loadSettings()
    setMasterVolume(settings.audioSettings.masterVolume)

    if (settings.audioSettings.voiceSensitivity) {
      setVoiceSensitivity(settings.audioSettings.voiceSensitivity)
    }
  }, [])

  // Salvar configurações quando mudam
  useEffect(() => {
    const settings = loadSettings()
    settings.audioSettings.masterVolume = masterVolume
    settings.audioSettings.voiceSensitivity = voiceSensitivity
    saveSettings(settings)

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = masterVolume
    }
  }, [masterVolume, voiceSensitivity])

  // Escutar eventos WebRTC
  useEffect(() => {
    const handleVoiceOffer = async (data: { targetUserId: string; offer: RTCSessionDescriptionInit }) => {
      if (data.targetUserId === user.id) {
        await handleReceiveOffer(data.offer)
      }
    }

    const handleVoiceAnswer = async (data: { targetUserId: string; answer: RTCSessionDescriptionInit }) => {
      if (data.targetUserId === user.id) {
        await handleReceiveAnswer(data.answer)
      }
    }

    const handleIceCandidate = async (data: { targetUserId: string; candidate: RTCIceCandidateInit }) => {
      if (data.targetUserId === user.id) {
        await handleReceiveIceCandidate(data.candidate)
      }
    }

    const handleVoiceJoin = (data: { voiceState: any }) => {
      if (data.voiceState.channelId === channel.id && data.voiceState.userId !== user.id) {
        setConnectedUsers((prev) => {
          const filtered = prev.filter((u) => u.userId !== data.voiceState.userId)
          return [...filtered, data.voiceState]
        })

        // Iniciar conexão WebRTC com o novo usuário
        if (isConnected) {
          initiateWebRTCConnection(data.voiceState.userId)
        }
      }
    }

    const handleVoiceLeave = (data: { userId: string }) => {
      setConnectedUsers((prev) => prev.filter((u) => u.userId !== data.userId))

      // Fechar conexão WebRTC
      const pc = peerConnections.current.get(data.userId)
      if (pc) {
        pc.close()
        peerConnections.current.delete(data.userId)
      }
    }

    wsManager.on("voice_offer", handleVoiceOffer)
    wsManager.on("voice_answer", handleVoiceAnswer)
    wsManager.on("voice_ice_candidate", handleIceCandidate)
    wsManager.on("voice_join", handleVoiceJoin)
    wsManager.on("voice_leave", handleVoiceLeave)

    return () => {
      wsManager.off("voice_offer", handleVoiceOffer)
      wsManager.off("voice_answer", handleVoiceAnswer)
      wsManager.off("voice_ice_candidate", handleIceCandidate)
      wsManager.off("voice_join", handleVoiceJoin)
      wsManager.off("voice_leave", handleVoiceLeave)
    }
  }, [channel.id, user.id, isConnected])

  const connectToVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      })
      mediaStreamRef.current = stream

      // Setup audio context and nodes
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)

      // Create analyzer for speaking detection
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 1024
      analyserRef.current.smoothingTimeConstant = 0.2

      // Create gain nodes for volume control
      gainNodeRef.current = audioContextRef.current.createGain()
      selfListenGainRef.current = audioContextRef.current.createGain()

      // Set initial volume
      gainNodeRef.current.gain.value = masterVolume
      selfListenGainRef.current.gain.value = 0

      // Connect nodes
      source.connect(analyserRef.current)
      source.connect(gainNodeRef.current)
      gainNodeRef.current.connect(selfListenGainRef.current)
      selfListenGainRef.current.connect(audioContextRef.current.destination)

      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      // Monitor audio levels for speaking detection
      const checkAudioLevel = () => {
        if (analyserRef.current && !isMicMuted && isConnected) {
          analyserRef.current.getByteFrequencyData(dataArray)

          let totalWeight = 0
          let weightedSum = 0

          for (let i = 0; i < bufferLength; i++) {
            const frequency = (i * audioContextRef.current!.sampleRate) / analyserRef.current.fftSize
            let weight = 1.0
            if (frequency > 300 && frequency < 3000) {
              weight = 2.0
            }

            weightedSum += dataArray[i] * weight
            totalWeight += weight
          }

          const average = weightedSum / totalWeight
          const speaking = average > 30 - voiceSensitivity

          if (speaking !== isSpeaking) {
            setIsSpeaking(speaking)
            onUpdateVoiceState?.({ isSpeaking: speaking })
          }
        } else {
          if (isSpeaking) {
            setIsSpeaking(false)
            onUpdateVoiceState?.({ isSpeaking: false })
          }
        }

        if (isConnected) {
          requestAnimationFrame(checkAudioLevel)
        }
      }

      checkAudioLevel()
      setIsConnected(true)
      onJoinVoice?.()

      // Conectar com usuários já no canal
      voiceUsers.forEach((voiceUser) => {
        if (voiceUser.userId !== user.id) {
          initiateWebRTCConnection(voiceUser.userId)
        }
      })
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("Erro ao acessar o microfone. Verifique as permissões.")
    }
  }

  const disconnectFromVoice = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Fechar todas as conexões WebRTC
    peerConnections.current.forEach((pc) => pc.close())
    peerConnections.current.clear()

    setIsConnected(false)
    setIsSpeaking(false)
    setIsSelfListening(false)
    setConnectedUsers([])
    onLeaveVoice?.()
  }

  const initiateWebRTCConnection = async (targetUserId: string) => {
    try {
      const pc = new RTCPeerConnection(rtcConfig)
      peerConnections.current.set(targetUserId, pc)

      // Adicionar stream local
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, mediaStreamRef.current!)
        })
      }

      // Escutar stream remoto
      pc.ontrack = (event) => {
        const remoteAudio = new Audio()
        remoteAudio.srcObject = event.streams[0]
        remoteAudio.volume = masterVolume
        remoteAudio.play().catch(console.error)
      }

      // Escutar candidatos ICE
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          wsManager.sendIceCandidate(targetUserId, event.candidate.toJSON())
        }
      }

      // Criar e enviar offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      wsManager.sendVoiceOffer(targetUserId, offer)
    } catch (error) {
      console.error("Error initiating WebRTC connection:", error)
    }
  }

  const handleReceiveOffer = async (offer: RTCSessionDescriptionInit) => {
    try {
      const senderId = "unknown" // Em uma implementação real, isso viria do servidor
      const pc = new RTCPeerConnection(rtcConfig)
      peerConnections.current.set(senderId, pc)

      // Adicionar stream local
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, mediaStreamRef.current!)
        })
      }

      // Escutar stream remoto
      pc.ontrack = (event) => {
        const remoteAudio = new Audio()
        remoteAudio.srcObject = event.streams[0]
        remoteAudio.volume = masterVolume
        remoteAudio.play().catch(console.error)
      }

      // Escutar candidatos ICE
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          wsManager.sendIceCandidate(senderId, event.candidate.toJSON())
        }
      }

      await pc.setRemoteDescription(offer)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      wsManager.sendVoiceAnswer(senderId, answer)
    } catch (error) {
      console.error("Error handling offer:", error)
    }
  }

  const handleReceiveAnswer = async (answer: RTCSessionDescriptionInit) => {
    try {
      const senderId = "unknown" // Em uma implementação real, isso viria do servidor
      const pc = peerConnections.current.get(senderId)
      if (pc) {
        await pc.setRemoteDescription(answer)
      }
    } catch (error) {
      console.error("Error handling answer:", error)
    }
  }

  const handleReceiveIceCandidate = async (candidate: RTCIceCandidateInit) => {
    try {
      const senderId = "unknown" // Em uma implementação real, isso viria do servidor
      const pc = peerConnections.current.get(senderId)
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error)
    }
  }

  const toggleMic = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = isMicMuted
        setIsMicMuted(!isMicMuted)
        onUpdateVoiceState?.({ isMuted: !isMicMuted })
      }
    }
  }

  const toggleDeafen = () => {
    const newDeafened = !isDeafened
    setIsDeafened(newDeafened)
    onUpdateVoiceState?.({ isDeafened: newDeafened })

    if (newDeafened) {
      setIsMicMuted(true)
      onUpdateVoiceState?.({ isMuted: true })
    }
  }

  const toggleSelfListening = () => {
    if (selfListenGainRef.current) {
      const newSelfListening = !isSelfListening
      selfListenGainRef.current.gain.value = newSelfListening ? 0.5 : 0
      setIsSelfListening(newSelfListening)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setMasterVolume(value[0])
  }

  const handleSensitivityChange = (value: number[]) => {
    setVoiceSensitivity(value[0])
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromVoice()
    }
  }, [])

  const getVolumeIcon = () => {
    if (isDeafened) return <VolumeX className="w-6 h-6" />
    if (masterVolume === 0) return <VolumeX className="w-6 h-6" />
    if (masterVolume < 0.5) return <Volume1 className="w-6 h-6" />
    return <Volume className="w-6 h-6" />
  }

  const getUsersInChannel = () => {
    const usersInVoice = voiceUsers.filter((v) => v.channelId === channel.id)
    return usersInVoice.map((voiceUser) => {
      const onlineUser = onlineUsers.find((u) => u.id === voiceUser.userId)
      return {
        ...voiceUser,
        nickname: onlineUser?.nickname || "Usuário",
        avatar: onlineUser?.avatar || "/placeholder.svg",
      }
    })
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-900">
      {/* Channel Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-700 shadow-sm bg-zinc-800">
        <div className="flex items-center">
          <Volume2 className="w-5 h-5 text-zinc-400 mr-2" />
          <h3 className="text-white font-semibold">{channel.name}</h3>
          <div className="ml-4 flex items-center gap-2 text-sm text-zinc-400">
            <Users className="w-4 h-4" />
            <span>
              {getUsersInChannel().length} conectado{getUsersInChannel().length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        {!isConnected ? (
          <Button onClick={connectToVoice} className="bg-green-600 hover:bg-green-700">
            Conectar
          </Button>
        ) : (
          <Button onClick={disconnectFromVoice} className="bg-red-600 hover:bg-red-700">
            Desconectar
          </Button>
        )}
      </div>

      {/* Voice Users */}
      <div className="flex-1 p-6">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-xl">
              <Volume2 className="w-12 h-12 text-zinc-400" />
            </div>
            <h3 className="text-2xl text-white mb-2 font-bold">Canal de Voz</h3>
            <p className="text-zinc-400 mb-6 max-w-md">
              Clique em "Conectar" para entrar no canal de voz e começar a conversar com pessoas de diferentes
              dispositivos
            </p>
            <div className="text-sm text-zinc-500 space-y-1">
              <p>🎤 Voz em tempo real via WebRTC</p>
              <p>🌐 Funciona entre diferentes redes</p>
              <p>📱 Compatível com celular e desktop</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Usuários conectados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getUsersInChannel().map((voiceUser) => (
                <div
                  key={voiceUser.userId}
                  className="flex flex-col items-center p-4 rounded-xl bg-zinc-800 border border-zinc-700 shadow-xl"
                >
                  <div className="relative mb-4">
                    <div
                      className={`w-16 h-16 rounded-full overflow-hidden ring-2 transition-all duration-300 ${
                        voiceUser.isSpeaking ? "ring-green-500 shadow-lg shadow-green-500/20" : "ring-zinc-600"
                      }`}
                    >
                      <img
                        src={voiceUser.avatar || "/placeholder.svg"}
                        alt={voiceUser.nickname}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {voiceUser.isMuted && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                        <MicOff className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {voiceUser.isSpeaking && !voiceUser.isMuted && (
                      <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-pulse" />
                    )}
                  </div>
                  <h4 className="text-white font-medium mb-1">{voiceUser.nickname}</h4>
                  <div className="flex items-center space-x-2 text-xs">
                    <div
                      className={`w-2 h-2 rounded-full ${voiceUser.isSpeaking && !voiceUser.isMuted ? "bg-green-500" : "bg-zinc-500"}`}
                    />
                    <span className="text-zinc-300">
                      {voiceUser.isSpeaking && !voiceUser.isMuted
                        ? "Falando"
                        : voiceUser.isMuted
                          ? "Mutado"
                          : "Conectado"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Volume Control */}
            {isVolumeControlOpen && (
              <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
                <h5 className="text-white font-medium">Controle de Volume</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Volume Geral</span>
                    <span className="text-sm text-zinc-400">{Math.round(masterVolume * 100)}%</span>
                  </div>
                  <Slider
                    value={[masterVolume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Voice Settings */}
            {isSettingsOpen && (
              <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
                <h5 className="text-white font-medium">Configurações de Voz</h5>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">Sensibilidade do Microfone</span>
                    <span className="text-sm text-zinc-300">{voiceSensitivity}</span>
                  </div>
                  <Slider
                    value={[voiceSensitivity]}
                    min={1}
                    max={29}
                    step={1}
                    onValueChange={handleSensitivityChange}
                    className="w-full"
                  />
                  <p className="text-xs text-zinc-400">
                    {voiceSensitivity < 10
                      ? "Baixa sensibilidade"
                      : voiceSensitivity < 20
                        ? "Sensibilidade média"
                        : "Alta sensibilidade"}
                  </p>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-zinc-400">
                    Ajuste a sensibilidade para que seu microfone detecte sua voz corretamente. Valores mais altos
                    detectam sons mais baixos.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Voice Controls */}
      {isConnected && (
        <div className="p-6 border-t border-zinc-700 bg-zinc-800">
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={toggleMic}
              variant={isMicMuted ? "destructive" : "secondary"}
              size="lg"
              className={`w-12 h-12 rounded-full shadow-lg transition-all ${
                isMicMuted ? "bg-red-600 hover:bg-red-700 text-white" : "bg-zinc-700 hover:bg-zinc-600 text-white"
              }`}
            >
              {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            <Button
              onClick={toggleDeafen}
              variant={isDeafened ? "destructive" : "secondary"}
              size="lg"
              className={`w-12 h-12 rounded-full shadow-lg transition-all ${
                isDeafened ? "bg-red-600 hover:bg-red-700 text-white" : "bg-zinc-700 hover:bg-zinc-600 text-white"
              }`}
            >
              {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>

            <Button
              onClick={toggleSelfListening}
              variant={isSelfListening ? "default" : "secondary"}
              size="lg"
              className={`w-12 h-12 rounded-full shadow-lg transition-all ${
                isSelfListening
                  ? "bg-zinc-600 hover:bg-zinc-500 text-white"
                  : "bg-zinc-700 hover:bg-zinc-600 text-white"
              }`}
            >
              <Headphones className="w-5 h-5" />
            </Button>

            <Button
              onClick={() => setIsVolumeControlOpen(!isVolumeControlOpen)}
              variant="secondary"
              size="lg"
              className="w-12 h-12 rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600 text-white"
            >
              {getVolumeIcon()}
            </Button>

            <Button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              variant="secondary"
              size="lg"
              className={`w-12 h-12 rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600 text-white ${
                isSettingsOpen ? "ring-2 ring-white" : ""
              }`}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex justify-center mt-4 space-x-4 text-sm text-zinc-400">
            <div className="flex flex-col items-center">
              <span className={isMicMuted ? "text-red-400" : "text-green-400"}>
                {isMicMuted ? "Microfone Mutado" : "Microfone Ativo"}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className={isDeafened ? "text-red-400" : "text-green-400"}>
                {isDeafened ? "Áudio Mutado" : "Áudio Ativo"}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className={isSelfListening ? "text-zinc-300" : "text-zinc-500"}>
                {isSelfListening ? "Auto-escuta Ativa" : "Auto-escuta Inativa"}
              </span>
            </div>
          </div>

          {/* Status da conexão de voz */}
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-700 rounded-full text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-zinc-300">
                Conectado via {wsManager.connectionState === "offline-mode" ? "P2P Local" : "WebRTC Real"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
