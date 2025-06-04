import type { NextRequest } from "next/server"

// Esta rota existe apenas para tentar a conexão WebSocket
// O Vercel não suporta WebSocket persistente, então vai falhar e usar o fallback
export async function GET(request: NextRequest) {
  return new Response("WebSocket endpoint - Use fallback mode", {
    status: 426,
    headers: {
      Upgrade: "websocket",
    },
  })
}
