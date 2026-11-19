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
                updateStatus("SCAN_QR", {
                    qr
                });
            }

            if (connection === "connecting") {
                updateStatus("CONNECTING");
            }

            if (connection
