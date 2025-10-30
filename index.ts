import NodeCache from 'node-cache';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage, CacheStore, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import * as qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const logger = pino({ level: 'silent' });

const useStore = !process.argv.includes('--no-store');

// Cria o diretório de mídia se não existir
const mediaDir = path.join(__dirname, 'media');
if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir);
}

async function extractMediaInfo(sock: any, msg: any) {
    const messageType = Object.keys(msg.message || {})[0];
    const isMediaMessage = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(messageType);

    if (!isMediaMessage || !msg.message) {
        return null;
    }

    try {
        const messageContent = msg.message[messageType];
        const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger, reuploadRequest: sock.updateMediaMessage }
        );

        let fileName;
        if (messageType === 'documentMessage') {
            fileName = messageContent.fileName;
        } else {
            const extension = messageContent.mimetype.split('/')[1].split(';')[0];
            fileName = `${msg.key.id}.${extension}`;
        }

        const mediaInfo = {
            mediaType: messageType,
            fileName: fileName,
            caption: messageContent.caption || null,
            size: {
                fileLength: messageContent.fileLength,
                height: messageContent.height || null,
                width: messageContent.width || null,
            },
            mimetype: messageContent.mimetype,
            base64: buffer.toString('base64'),
            buffer: buffer,
        };

        return mediaInfo;

    } catch (error) {
        console.error('Erro ao extrair informações da mídia:', error);
        return null;
    }
}

const msgRetryCounterCache = new NodeCache() as CacheStore

async function connectToWhatsApp() {
	const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
	const { version, isLatest } = await fetchLatestBaileysVersion()

	console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

	const sock = makeWASocket({
		version,
		logger,
		auth: state, // Usar state diretamente como no exemplo oficial
		msgRetryCounterCache,
		generateHighQualityLinkPreview: true,
	})
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Se o QR Code existir, nós o exibimos no terminal
        if (qr) {
            console.log("QR Code recebido, escaneie com seu celular!");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as unknown as Boom | undefined)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada devido a ', lastDisconnect?.error?.message ?? 'desconhecido', (shouldReconnect ? ', reconectando... ' : ''));
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('Conexão fechada devido a ', lastDisconnect?.error?.message ?? 'desconhecido');
            }
        } else if (connection === 'open') {
            console.log('Conexão aberta com sucesso!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (event) => {
        for (const msg of event.messages) {
            console.log("================================ MENSAGEM RECEBIDA ===============================================");
            console.log("De:", msg.key.remoteJid)
            
            try {
                const targetJid = process.env.TARGET_JID;
                if (!targetJid) {
                    console.warn('TARGET_JID não definido no .env; pulando envio automático.');
                }
                if (targetJid && msg.key.remoteJid === targetJid) {
                    await sock.sendMessage(msg.key.remoteJid!, { text: 'Hello World' })
                    console.log("✅ Mensagem enviada!")
                }
            } catch (error: any) {
                console.log("❌ Erro:", error?.message ?? error)
            }

            const mediaData = await extractMediaInfo(sock, msg);
            if (mediaData) {
                console.log("Informações da mídia extraída:", {
                    mediaType: mediaData.mediaType,
                    fileName: mediaData.fileName,
                    caption: mediaData.caption,
                    size: mediaData.size,
                    mimetype: mediaData.mimetype,
                });

                const filePath = path.join(mediaDir, mediaData.fileName || 'file');

                await fs.promises.writeFile(filePath, mediaData.buffer);
                console.log(`Mídia salva em: ${filePath}`);
            }
        }
    });

    return sock;
}

connectToWhatsApp();