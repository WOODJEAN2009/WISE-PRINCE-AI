import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors());
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Home route
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
        whatsapp: "DISCONNECTED",
        ai: "WAITING",
        uptime: process.uptime()
    });
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
});
