import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import QRCode from "qrcode";
import { fileURLToPath } from "url";

import {
    connectWhatsApp,
    requestPairingCode,
    getWhatsAppStatus,
    disconnectWhatsApp
} from "./src/sessionManager.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let whatsappState = {
    status: "DISCONNECTED",
    qr: null,
    qrImage: null,
    user: null
};

// Security for WhatsApp connection endpoints
function protectAPI(req, res, next) {
    const token = process.env.ADMIN_TOKEN;

    if (!token) {
        return res.status(503).json({
            error: "ADMIN_TOKEN is not configured."
        });
    }

    if (req.headers.authorization !== `Bearer ${token}`) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    next();
}

// Home
app.get("/", (req, res) => {
    res.json({
        name: "WISE PRINCE AI",
        developer: "WISE PRINCE",
        creator: "WOOD",
        status: "ONLINE",
        message: "Your Intelligent Personal Assistant 👑"
    });
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        whatsapp: whatsappState.status,
        ai: "WAITING",
        uptime: process.uptime()
    });
});

// WhatsApp status
app.get("/api/whatsapp/status", protectAPI, (req, res) => {
    res.json({
        ...getWhatsAppStatus(),
        status: whatsappState.status
    });
});

// QR Code
app.get("/api/whatsapp/qr", protectAPI, (req, res) => {
    if (!whatsappState.qrImage) {
        return res.status(404).json({
            error: "QR Code not available yet.",
            status: whatsappState.status
        });
    }

    res.json({
        status: whatsappState.status,
        qr: whatsappState.qrImage
    });
});

// Pairing Code
app.post("/api/whatsapp/pairing-code", protectAPI, async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                error: "Phone number is required."
            });
        }

        const code = await requestPairingCode(phoneNumber);

        res.json({
            success: true,
            pairingCode: code
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Disconnect WhatsApp
app.post("/api/whatsapp/disconnect", protectAPI, async (req, res) => {
    try {
        await disconnectWhatsApp();

        whatsappState = {
            status: "DISCONNECTED",
            qr: null,
            qrImage: null,
            user: null
        };

        res.json({
            success: true,
            status: "DISCONNECTED"
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log("╭━━━━━━━━━━━━━━━━━━━━━━╮");
    console.log("┃     👑 WISE PRINCE AI");
    console.log("┃━━━━━━━━━━━━━━━━━━━━━━");
    console.log("┃ Developer: WISE PRINCE");
    console.log("┃ Creator: WOOD");
    console.log("┃ Status: ONLINE 🟢");
    console.log("╰━━━━━━━━━━━━━━━━━━━━━━╯");

    console.log(`Server running on port ${PORT}`);

    // Start WhatsApp session
    connectWhatsApp(async (update) => {
        whatsappState.status = update.status;

        if (update.qr) {
            whatsappState.qr = update.qr;

            try {
                whatsappState.qrImage =
                    await QRCode.toDataURL(update.qr);
            } catch (error) {
                console.error("QR generation error:", error);
            }
        }

        if (update.user) {
            whatsappState.user = update.user;
            whatsappState.qr = null;
            whatsappState.qrImage = null;
        }

        if (update.status === "DISCONNECTED") {
            whatsappState.qr = null;
            whatsappState.qrImage = null;
        }

        console.log("WhatsApp status:", update.status);
    });
});
