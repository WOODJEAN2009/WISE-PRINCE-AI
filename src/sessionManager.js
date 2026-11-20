import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason
} from "@whiskeysockets/baileys";

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_DIR = path.join(
    __dirname,
    "../sessions/auth_info"
);

let sock = null;
let status = "DISCONNECTED";
let reconnectTimer = null;
let manuallyDisconnected = false;
let connecting = false;
let currentUpdate = () => {};
let authState = null;

function updateStatus(newStatus, extra = {}) {
    status = newStatus;

    currentUpdate({
        status,
        ...extra
    });
}

export async function connectWhatsApp(onUpdate = () => {}) {
    currentUpdate = onUpdate;

    if (connecting || status === "CONNECTED") {
        return;
    }

    connecting = true;
    manuallyDisconnected = false;

    try {
        fs.mkdirSync(SESSION_DIR, {
            recursive: true
        });

        const { state, saveCreds } =
            await useMultiFileAuthState(SESSION_DIR);

        authState = state;

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: [
                "WISE PRINCE AI",
                "Chrome",
                "1.0.0"
            ],
            syncFullHistory: false,
            markOnlineOnConnect: true
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {
            const {
                connection,
                lastDisconnect,
                qr
            } = update;

            if (qr) {
                updateStatus("SCAN_QR", { qr });
            }

            if (connection === "connecting") {
                updateStatus("CONNECTING");
            }

            if (connection === "open") {
                connecting = false;

                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }

                updateStatus("CONNECTED", {
                    user: sock.user
                });

                console.log("WhatsApp connected!");
            }

            if (connection === "close") {
                connecting = false;
                sock = null;

                updateStatus("DISCONNECTED");

                const code =
                    lastDisconnect?.error?.output?.statusCode;

                if (
                    code !== DisconnectReason.loggedOut &&
                    !manuallyDisconnected
                ) {
                    console.log("Reconnecting WhatsApp...");

                    if (!reconnectTimer) {
                        reconnectTimer = setTimeout(() => {
                            reconnectTimer = null;
                            connectWhatsApp(currentUpdate);
                        }, 5000);
                    }
                }
            }
        });

    } catch (error) {
        connecting = false;

        updateStatus("ERROR", {
            error: error.message
        });

        console.error("WhatsApp error:", error);

        if (!manuallyDisconnected && !reconnectTimer) {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                connectWhatsApp(currentUpdate);
            }, 10000);
        }
    }
}

export async function requestPairingCode(phoneNumber) {
    if (!sock) {
        throw new Error("WhatsApp socket is not initialized.");
    }

    if (status === "CONNECTED") {
        throw new Error("WhatsApp is already connected.");
    }

    if (authState?.creds?.registered) {
        throw new Error("WhatsApp session is already registered.");
    }

    const number = String(phoneNumber).replace(/\D/g, "");

    if (!number || number.length < 8) {
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

export async function disconnectWhatsApp() {
    manuallyDisconnected = true;

    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    if (sock) {
        try {
            await sock.logout();
        } catch (error) {
            console.error("Logout error:", error.message);
        }

        sock = null;
    }

    connecting = false;
    updateStatus("DISCONNECTED");

    return {
        status: "DISCONNECTED"
    };
}
