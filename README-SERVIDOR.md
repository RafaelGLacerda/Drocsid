# 🚀 Como Configurar o Servidor WebSocket do Drocsid

## 📋 Pré-requisitos

1. **Node.js** (versão 16 ou superior)
2. **npm** ou **yarn**

## 🛠️ Instalação e Configuração

### 1. Instalar Node.js
\`\`\`bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm

# macOS (com Homebrew)
brew install node

# Windows
# Baixe de https://nodejs.org/
\`\`\`

### 2. Configurar o Servidor
\`\`\`bash
# Navegue até a pasta do servidor
cd server

# Instale as dependências
npm install

# Inicie o servidor
npm start

# Para desenvolvimento (com auto-reload)
npm run dev
\`\`\`

### 3. Configurar o Cliente (Next.js)
\`\`\`bash
# Na raiz do projeto, crie um arquivo .env.local
echo "NEXT_PUBLIC_WS_URL=ws://localhost:8080" > .env.local

# Ou para servidor remoto
echo "NEXT_PUBLIC_WS_URL=ws://SEU_SERVIDOR:8080" > .env.local
\`\`\`

## 🌐 Deploy em Produção

### Opção 1: VPS/Servidor Próprio
\`\`\`bash
# 1. Faça upload dos arquivos do servidor
scp -r server/ usuario@seu-servidor:/home/usuario/drocsid-server/

# 2. Conecte ao servidor
ssh usuario@seu-servidor

# 3. Instale dependências e inicie
cd drocsid-server
npm install
npm start

# 4. Para manter rodando (com PM2)
npm install -g pm2
pm2 start websocket-server.js --name "drocsid-server"
pm2 startup
pm2 save
\`\`\`

### Opção 2: Railway (Gratuito)
\`\`\`bash
# 1. Instale Railway CLI
npm install -g @railway/cli

# 2. Faça login
railway login

# 3. Na pasta server/
railway init
railway up

# 4. Configure variáveis de ambiente
railway variables set PORT=8080
\`\`\`

### Opção 3: Render (Gratuito)
1. Conecte seu repositório GitHub ao Render
2. Crie um novo "Web Service"
3. Configure:
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Port: `8080`

### Opção 4: Heroku
\`\`\`bash
# 1. Instale Heroku CLI
# 2. Na pasta server/
heroku create seu-app-drocsid
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a seu-app-drocsid
git push heroku main
\`\`\`

## 🔧 Configuração de Firewall

### Ubuntu/Debian
\`\`\`bash
sudo ufw allow 8080
sudo ufw enable
\`\`\`

### CentOS/RHEL
\`\`\`bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
\`\`\`

## 📱 Testando a Conexão

### 1. Teste Local
\`\`\`bash
# Terminal 1: Inicie o servidor
cd server
npm start

# Terminal 2: Teste a conexão
curl http://localhost:8080/api/servers
\`\`\`

### 2. Teste Remoto
\`\`\`bash
# Substitua SEU_IP pelo IP do seu servidor
curl http://SEU_IP:8080/api/servers
\`\`\`

## 🌍 Configuração para Acesso Externo

### 1. Configurar IP Público
\`\`\`javascript
// No arquivo websocket-server.js, modifique:
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0'; // Permite acesso externo

server.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor rodando em ${HOST}:${PORT}`);
});
\`\`\`

### 2. Configurar DNS (Opcional)
\`\`\`bash
# Configure um subdomínio para seu servidor
# Exemplo: drocsid-api.seudominio.com
\`\`\`

### 3. SSL/HTTPS (Recomendado)
\`\`\`bash
# Com Nginx como proxy reverso
sudo apt install nginx certbot python3-certbot-nginx

# Configure SSL
sudo certbot --nginx -d drocsid-api.seudominio.com
\`\`\`

## 🔍 Monitoramento

### Logs do Servidor
\`\`\`bash
# Ver logs em tempo real
tail -f /var/log/drocsid/server.log

# Com PM2
pm2 logs drocsid-server
\`\`\`

### Status da Aplicação
\`\`\`bash
# Verificar se está rodando
ps aux | grep node

# Com PM2
pm2 status
\`\`\`

## 🚨 Solução de Problemas

### Erro: "EADDRINUSE"
\`\`\`bash
# Porta já está em uso
sudo lsof -i :8080
sudo kill -9 PID_DO_PROCESSO
\`\`\`

### Erro: "Connection Refused"
\`\`\`bash
# Verificar firewall
sudo ufw status
sudo iptables -L

# Verificar se o servidor está rodando
netstat -tlnp | grep 8080
\`\`\`

### Erro: "WebSocket connection failed"
\`\`\`bash
# Verificar URL no .env.local
cat .env.local

# Testar conexão WebSocket
wscat -c ws://localhost:8080
\`\`\`

## 📊 Monitoramento de Performance

### Instalar ferramentas de monitoramento
\`\`\`bash
npm install -g clinic
clinic doctor -- node websocket-server.js
\`\`\`

### Métricas básicas
\`\`\`javascript
// Adicionar ao servidor para monitoramento
setInterval(() => {
  console.log(`👥 Usuários conectados: ${connectedUsers.size}`);
  console.log(`🏠 Servidores ativos: ${servers.size}`);
  console.log(`💾 Uso de memória: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
}, 30000);
\`\`\`

## 🎯 Próximos Passos

1. **Banco de Dados**: Integrar PostgreSQL ou MongoDB
2. **Redis**: Para cache e sessões
3. **Load Balancer**: Para múltiplas instâncias
4. **CDN**: Para arquivos estáticos
5. **Backup**: Sistema de backup automático
