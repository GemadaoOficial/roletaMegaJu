# 🎰 Roleta Loja Mada

Sistema de roleta da sorte com painel administrativo e sincronização em tempo real entre dispositivos.

## 🚀 Instalação Super Rápida

### 1. Instalar dependências
```bash
npm install
```

### 2. Rodar o projeto
```bash
npm run dev
```

Pronto! 🎉 O projeto vai rodar em:
- **Frontend (Vite + React):** http://localhost:5000
- **Backend (Node.js API):** http://localhost:5001

## 📱 Acessar do Celular

### 1. Descubra o IP do seu PC
```bash
ipconfig
```
Procure pelo "Endereço IPv4" (ex: 192.168.1.100)

### 2. Acesse do celular (mesma rede Wi-Fi)
- **Painel Admin:** http://192.168.1.100:5000/admin
- **Roleta (Overlay):** http://192.168.1.100:5000/

## 🎮 Como Usar

### Painel Administrativo (/admin)
- **Gerenciar Prêmios:** Adicione, edite ou remova prêmios
- **Ajustar Probabilidades:** Use "Balancear" para somar 100%
- **Girar Roleta:** Clique em "GIRAR" - todos os dispositivos verão!
- **Mostrar/Ocultar:** Controle a visibilidade da roleta

### Overlay da Roleta (/)
- Página limpa para transmissões (OBS Studio)
- Responde automaticamente aos comandos do admin
- Detecta OBS e desabilita áudio

## 🔧 Estrutura do Projeto

```
roleta/
├── server/              # API Node.js (porta 5001)
│   ├── index.js         # Servidor Express
│   ├── data.json        # Dados persistentes (auto-criado)
│   └── spin_command.json
├── src/                 # Frontend React (porta 5000)
│   ├── hooks/           # Zustand store + sincronização
│   ├── components/      # Admin + Roleta
│   └── ...
└── package.json
```

## ✨ Funcionalidades

✅ **Sincronização entre dispositivos** via API Node.js
✅ **100% Responsivo** - funciona em mobile, tablet, desktop
✅ **Polling em tempo real** - atualizações automáticas
✅ **Sem XAMPP/Apache** - apenas Node.js
✅ **Fácil de usar** - apenas `npm run dev`

## 🛠️ Scripts Disponíveis

- `npm run dev` - Roda API + Frontend juntos
- `npm run client` - Apenas o frontend (Vite)
- `npm run api` - Apenas a API (Node.js)
- `npm run build` - Build de produção

## 🎨 Tecnologias

- **Frontend:** React 19, Vite, Zustand, TailwindCSS, GSAP
- **Backend:** Node.js, Express, CORS
- **Animações:** Canvas Confetti, GSAP
- **Áudio:** Web Audio API

## 📞 Problemas?

1. Verifique se a porta 5000 e 5001 estão livres
2. Certifique-se de que está na mesma rede Wi-Fi
3. Olhe o console do navegador (F12) para erros
4. Verifique os logs do terminal do Node.js

## 🎉 Pronto para usar!

Agora você pode:
- ✅ Alterar configurações em qualquer dispositivo
- ✅ Girar a roleta de qualquer lugar
- ✅ Usar em telas de todos os tamanhos
- ✅ Integrar com OBS Studio

**Sem XAMPP, sem PHP, sem complicação!** 🚀
