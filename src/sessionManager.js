import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason
} from "@whiskeysockets/baileys";

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_DIR = path.join(
    __dirname,
    "../sessions/auth_info"
);

let sock = null;
let status = "DISCONNECTED";
let reconnecting = false;

export async function connectWhatsApp(onUpdate = () => {}) {
    if (reconnecting) return;

    reconnecting = true;

    try {
        fs.mkdirSync(SESSION_DIR, { recursive: true });

        const { state, saveCreds } =
            await useMultiFileAuthState(SESSION_DIR);

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ["WISE PRINCE AI", "Chrome", "1.0.0"],
            syncFullHistory: false
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                status = "SCAN_QR";
                onUpdate({ status, qr });
            }

            if (connection === "connecting") {
                status = "CONNECTING";
                onUpdate({ status });
            }

            if (connection === "open") {
                status = "CONNECTED";
                reconnecting = false;

                onUpdate({
                    status,
                    user: sock.user
                });

                console.log("WISE PRINCE AI: WhatsApp connected!");
            }

            if (connection === "close") {
                status = "DISCONNECTED";
                reconnecting = false;

                onUpdate({ status });

                const code =
                    lastDisconnect?.error?.output?.statusCode;

                if (code !== DisconnectReason.loggedOut) {
                    console.log("Reconnecting WhatsApp...");

                    setTimeout(() => {
                        connectWhatsApp(onUpdate);
                    }, 5000);
                }
            }
        });

    } catch (error) {
        reconnecting = false;
        status = "ERROR";

        console.error("WhatsApp error:", error);

        onUpdate({
            status,
            error: error.message
        });
    }
}

export async function requestPairingCode(phoneNumber) {
    if (!sock) {
        throw new Error("WhatsApp socket is not initialized.");
    }

    if (sock.authState?.creds?.registered) {
        throw new Error("WhatsApp is already registered.");
    }

    const number = phoneNumber.replace(/\D/g, "");

    if (!number) {
        throw new Error("Invalid phone number.");
    }

    return await sock.requestPairingCode(number);
}

export function getWhatsAppStatus() {
    return {
        status,
        connected: status === "CONNECTED"
    };
}

export async function disconnectWhats
