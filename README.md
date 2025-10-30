# Baileys Debug

Projeto simples em TypeScript para testar/conectar no WhatsApp usando `@whiskeysockets/baileys`.

## Pré-requisitos
- Node.js 18+ (recomendado 18 ou 20)
- NPM 8+

## Instalação
```bash
cd "D:/laragon/www/baileys-debug"
npm install
```

## Executar
- Modo padrão:
```bash
npm start
```
- Ou diretamente com tsx:
```bash
npx tsx index.ts
```

Ao iniciar, um QR Code aparecerá no terminal. Escaneie com o WhatsApp do celular (Aparelhos conectados > Conectar um aparelho).

### Variáveis de ambiente (.env)
Crie um arquivo `.env` na raiz com, por exemplo:
```env
TARGET_JID=559999999999@s.whatsapp.net
```
O código só enviará a mensagem automática "Hello World" quando o `remoteJid` recebido for igual ao `TARGET_JID`.

## Pastas importantes
- `baileys_auth_info/`: armazena as credenciais da sessão. Para refazer login, apague esta pasta e rode novamente.
- `media/`: mídias recebidas serão salvas aqui (imagens, vídeos, docs, etc.).

## Scripts
- `npm start`: roda `tsx index.ts`.
- `npm run dev`: roda `tsx watch index.ts` (hot reload no terminal).

## Configuração do TypeScript
O projeto inclui `tsconfig.json` com as opções:
- `esModuleInterop: true`, `moduleResolution: Node`, `skipLibCheck: true`, `types: ["node"]`.

## Dependências principais
- `@whiskeysockets/baileys@7.0.0-rc.6`
- `pino` e `pino-pretty` (logs)
- `node-cache`
- `qrcode-terminal`
- `@hapi/boom`

DevDeps:
- `tsx`, `typescript`, `ts-node`, `@types/node`, `@types/qrcode-terminal`

## Notas
- Caso ocorra erro de versão do Baileys, confirme a versão disponível:
```bash
npm view @whiskeysockets/baileys version
```
- Se quiser zerar a sessão, apague `baileys_auth_info/` com o app fechado.

## Personalizações
- Mensagem automática no `index.ts`: atualmente envia "Hello World" apenas para um JID específico. Ajuste a lógica em `messages.upsert` conforme sua necessidade.

---
Se precisar, posso adicionar exemplos de envio de mídia, respostas a comandos e filtros de grupos/contatos.

