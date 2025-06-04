"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { isNicknameAvailable, saveRegisteredUser } from "@/lib/friends-system"
import type { User } from "@/types"

interface AuthScreenProps {
  onLogin: (user: User) => void
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false)
  const [guestNickname, setGuestNickname] = useState("")
  const [nicknameError, setNicknameError] = useState("")

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const nickname = formData.get("nickname") as string

    // Verificar se o nickname está disponível
    if (!isNicknameAvailable(nickname)) {
      setIsLoading(false)
      alert("Este nickname já está em uso. Escolha outro.")
      return
    }

    // Simular criação de conta
    setTimeout(() => {
      const newUser: User = {
        id: Date.now().toString(),
        email,
        nickname,
        avatar: "/placeholder.svg?height=40&width=40",
        bio: "",
        isGuest: false,
      }

      // Salvar usuário na lista global
      saveRegisteredUser(newUser)
      onLogin(newUser)
      setIsLoading(false)
    }, 1000)
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // Simular login
    setTimeout(() => {
      const user: User = {
        id: Date.now().toString(),
        email,
        nickname: email.split("@")[0],
        avatar: "/placeholder.svg?height=40&width=40",
        bio: "Usuário do Drocsid",
        isGuest: false,
      }

      // Salvar usuário na lista global
      saveRegisteredUser(user)
      onLogin(user)
      setIsLoading(false)
    }, 1000)
  }

  const handleGuestNicknameChange = (value: string) => {
    setGuestNickname(value)
    setNicknameError("")

    if (value.trim() && !isNicknameAvailable(value)) {
      setNicknameError("Este nickname já está em uso")
    }
  }

  const handleGuestLogin = () => {
    if (!guestNickname.trim()) {
      setNicknameError("Digite um nickname")
      return
    }

    if (!isNicknameAvailable(guestNickname)) {
      setNicknameError("Este nickname já está em uso")
      return
    }

    const guestUser: User = {
      id: Date.now().toString(),
      email: "",
      nickname: guestNickname.trim(),
      avatar: "/placeholder.svg?height=40&width=40",
      bio: "Usuário convidado",
      isGuest: true,
    }

    // Salvar usuário na lista global
    saveRegisteredUser(guestUser)
    onLogin(guestUser)
    setIsGuestModalOpen(false)
    setGuestNickname("")
    setNicknameError("")
  }

  const validateNickname = (nickname: string) => {
    if (!nickname.trim()) return false
    if (nickname.length < 3) return false
    if (nickname.length > 20) return false
    if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) return false
    return isNicknameAvailable(nickname)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-900">
      <Card className="w-full max-w-md relative z-10 bg-zinc-800 border-zinc-700 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-zinc-700 to-zinc-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">D</span>
          </div>
          <CardTitle className="text-3xl font-bold text-white">Drocsid</CardTitle>
          <CardDescription className="text-zinc-400">
            Conecte-se, converse e compartilhe momentos únicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-700">
              <TabsTrigger value="login" className="data-[state=active]:bg-zinc-600">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-zinc-600">
                Criar Conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Input
                    name="email"
                    type="email"
                    placeholder="Email"
                    required
                    className="bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400 focus:border-zinc-500"
                  />
                </div>
                <div>
                  <Input
                    name="password"
                    type="password"
                    placeholder="Senha"
                    required
                    className="bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400 focus:border-zinc-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-zinc-600 hover:bg-zinc-500 text-white font-semibold py-3 rounded-md shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <Input
                    name="email"
                    type="email"
                    placeholder="Email"
                    required
                    className="bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400 focus:border-zinc-500"
                  />
                </div>
                <div>
                  <Input
                    name="nickname"
                    type="text"
                    placeholder="Nickname (único)"
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_-]+"
                    title="Apenas letras, números, _ e - são permitidos"
                    className="bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400 focus:border-zinc-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">3-20 caracteres, apenas letras, números, _ e -</p>
                </div>
                <div>
                  <Input
                    name="password"
                    type="password"
                    placeholder="Senha"
                    required
                    className="bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400 focus:border-zinc-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-zinc-600 hover:bg-zinc-500 text-white font-semibold py-3 rounded-md shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Criando..." : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-800 px-2 text-zinc-400">ou</span>
            </div>
          </div>

          <Dialog open={isGuestModalOpen} onOpenChange={setIsGuestModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600 hover:border-zinc-500 py-3 rounded-md"
              >
                Entrar como Convidado
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-800 border-zinc-700">
              <DialogHeader>
                <DialogTitle className="text-white text-center">Entrar como Convidado</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="guest-nickname" className="text-zinc-300">
                    Escolha seu nickname único
                  </Label>
                  <Input
                    id="guest-nickname"
                    value={guestNickname}
                    onChange={(e) => handleGuestNicknameChange(e.target.value)}
                    placeholder="Digite seu nickname..."
                    className="bg-zinc-700 border-zinc-600 text-white mt-2"
                    onKeyPress={(e) => e.key === "Enter" && handleGuestLogin()}
                    autoFocus
                  />
                  {nicknameError && (
                    <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{nicknameError}</span>
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-1">3-20 caracteres, apenas letras, números, _ e -</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleGuestLogin}
                    disabled={!guestNickname.trim() || !!nicknameError}
                    className="flex-1 bg-zinc-600 hover:bg-zinc-500"
                  >
                    Entrar
                  </Button>
                  <Button
                    onClick={() => {
                      setIsGuestModalOpen(false)
                      setGuestNickname("")
                      setNicknameError("")
                    }}
                    variant="outline"
                    className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
