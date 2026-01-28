# 🚀 INÍCIO RÁPIDO - Roleta Loja Mada

## ⚡ TL;DR - Rode agora!

```bash
cd C:\xampp\htdocs\roleta
npm run dev
```

Acesse:
- 👨‍💼 **Admin:** http://localhost:5000/admin
- 🎰 **Roleta:** http://localhost:5000/

---

## 📱 Acessar do Celular

### 1. Descubra seu IP
```bash
ipconfig
```
Anote o "Endereço IPv4" (ex: 192.168.1.100)

### 2. No celular (mesma Wi-Fi)
- Admin: **http://192.168.1.100:5000/admin**
- Roleta: **http://192.168.1.100:5000/**

---

## 🎮 Teste Rápido de Sincronização

1. Abra o admin no PC: http://localhost:5000/admin
2. Abra o admin no celular: http://SEU_IP:5000/admin
3. Adicione um prêmio em um dispositivo
4. Veja aparecer no outro automaticamente! ✨

---

## 🔧 O que está rodando?

Quando você roda `npm run dev`, dois servidores sobem:

1. **Frontend (porta 5000)** - React + Vite
   - Interface da roleta e painel admin
   - Usa proxy para se comunicar com a API

2. **Backend (porta 5001)** - Node.js + Express
   - API de sincronização entre dispositivos
   - Salva dados em arquivos JSON

---

## 🎯 Principais Funcionalidades

### No Painel Admin (/admin)
✅ **Adicionar/Editar Prêmios** - Clique no texto para editar
✅ **Ajustar Probabilidades** - Use o botão "Balancear" para somar 100%
✅ **Girar Roleta** - Todos os dispositivos verão o giro
✅ **Mostrar/Ocultar** - Controle a visibilidade
✅ **Ajustar Tempo** - Configure duração do giro

### Na Roleta (/)
✅ **Overlay Limpo** - Ideal para OBS Studio
✅ **Animações Suaves** - GSAP + Canvas Confetti
✅ **Áudio Dinâmico** - Som muda com velocidade
✅ **Responsiva** - Funciona em qualquer tela

---

## 📊 Arquivos Importantes

```
roleta/
├── server/
│   ├── index.js          # ⚙️ API Node.js
│   ├── data.json         # 💾 Dados da roleta (auto-criado)
│   └── spin_command.json # 🎲 Comandos de giro
│
├── src/
│   ├── hooks/
│   │   ├── useRouletteStore.js  # 🗄️ Estado + Sync
│   │   └── useBroadcast.js      # 📡 Polling
│   │
│   ├── components/
│   │   ├── Admin/
│   │   │   └── Admin.jsx        # 👨‍💼 Painel admin
│   │   └── Roulette/
│   │       └── Wheel.jsx        # 🎰 Componente roleta
│   │
│   └── App.jsx           # 🗺️ Rotas
│
├── vite.config.js        # ⚡ Config Vite + Proxy
└── package.json          # 📦 Dependências + Scripts
```

---

## 🛠️ Scripts Disponíveis

```bash
npm run dev      # 🚀 Roda tudo (API + Frontend)
npm run client   # 💻 Apenas frontend (porta 5000)
npm run api      # 🔌 Apenas API (porta 5001)
npm run build    # 📦 Build de produção
```

---

## 🐛 Problemas Comuns

### Erro: "Port 5000 is already in use"
```bash
# Windows - Encontre e mate o processo
netstat -ano | findstr :5000
taskkill /PID [número_do_pid] /F
```

### Não consigo acessar do celular
1. ✅ Mesma rede Wi-Fi?
2. ✅ IP correto? (use `ipconfig`)
3. ✅ Firewall liberado? (Windows pode bloquear)

### Mudanças não sincronizam
1. ✅ Console do navegador (F12) - tem erros?
2. ✅ Terminal do Node - servidor rodando?
3. ✅ Arquivo `server/data.json` existe?

---

## 🎨 Personalizar

### Mudar cores da roleta
Edite os prêmios no admin (campo de cor)

### Mudar tempo de giro
Painel admin → "Tempo de Giro (segundos)"

### Adicionar novos temas
Edite `src/components/Roulette/Wheel.jsx`

---

## 🌟 Benefícios desta Versão

✅ **Sem XAMPP** - Apenas Node.js
✅ **Sem Apache** - Vite Dev Server
✅ **Sem PHP** - JavaScript puro
✅ **Setup Rápido** - Um comando apenas
✅ **Hot Reload** - Mudanças instantâneas
✅ **Network Access** - Funciona em qualquer dispositivo da rede

---

## 🎉 Pronto!

Agora é só usar:

```bash
npm run dev
```

E começar a girar a roleta! 🎰✨

**Dúvidas?** Olhe o [README.md](README.md) completo.
