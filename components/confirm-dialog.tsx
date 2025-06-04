"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, LogOut, Trash2 } from "lucide-react"

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  type: "delete" | "leave" | "other"
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ isOpen, title, message, type, onConfirm, onCancel }: ConfirmDialogProps) {
  const getIcon = () => {
    switch (type) {
      case "delete":
        return <Trash2 className="w-6 h-6 text-red-500" />
      case "leave":
        return <LogOut className="w-6 h-6 text-amber-500" />
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-500" />
    }
  }

  const getButtonStyle = () => {
    switch (type) {
      case "delete":
        return "bg-red-600 hover:bg-red-700 text-white"
      case "leave":
        return "bg-amber-600 hover:bg-amber-700 text-white"
      default:
        return "bg-zinc-600 hover:bg-zinc-700 text-white"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="bg-zinc-800 border-zinc-700">
        <DialogHeader className="flex flex-row items-center gap-4">
          {getIcon()}
          <DialogTitle className="text-white">{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-zinc-300">{message}</p>
        </div>
        <DialogFooter className="flex space-x-2 sm:space-x-0">
          <Button variant="outline" onClick={onCancel} className="border-zinc-600 text-zinc-300 hover:bg-zinc-700">
            Cancelar
          </Button>
          <Button onClick={onConfirm} className={getButtonStyle()}>
            {type === "delete" ? "Excluir" : type === "leave" ? "Sair" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
