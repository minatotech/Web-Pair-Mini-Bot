require("dotenv").config();
const express = require("express");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

const handlerImport = require("./handler");
const config = require("./config");

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const executeHandler = typeof handlerImport === "function" 
    ? handlerImport 
    : (handlerImport.default || Object.values(handlerImport).find(f => typeof f === "function"));

const app = express();
app.use(express.json());

// Trust upstream proxies (Heroku, Render, Cloudflare, VPS Nginx)
app.set('trust proxy', 1);

const activeSockets = new Map();

if (!fs.existsSync(config.SESSIONS_DIR)) {
    fs.mkdirSync(config.SESSIONS_DIR);
}

// ⚡ BOT CORE INSTANTIATOR
async function startBot(phoneNumber) {
    const cleanNum = phoneNumber.replace(/[^0-9]/g, "");
    const sessionPath = path.join(config.SESSIONS_DIR, `num_${cleanNum}`);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false
    });

    activeSockets.set(cleanNum, sock);
    sock.ev.on("creds.update", saveCreds);

    // Connection lifecycle updates
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log(`\n⚡ Connected successfully for [${cleanNum}]`);
            
            // 📢 AUTO-FOLLOW CHANNEL ALGORITHM
            try {
                // Baileys query targeting target newsletter parameters [1, 2]
                await sock.query({
                    tag: 'iq',
                    attrs: {
                        to: config.TARGET_NEWSLETTER,
                        type: 'set',
                        xmlns: 'newsletter',
                    },
                    content: [
                        {
                            tag: 'subscribe',
                            attrs: {},
                            content: null
                        }
                    ]
                });
                console.log(`📢 [${cleanNum}] successfully auto-followed channel: ${config.TARGET_NEWSLETTER}`);
            } catch (followErr) {
                console.error(`❌ Auto-follow failed for [${cleanNum}]:`, followErr.message);
            }
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode === DisconnectReason.loggedOut) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                activeSockets.delete(cleanNum);
            } else {
                setTimeout(() => startBot(cleanNum), 5000);
            }
        }
    });

    // Incoming Messages Listener
    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m?.message) return;
            const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
            if (!text) return;

            if (typeof executeHandler === "function") {
                await executeHandler(sock, m, text);
            }
        } catch (err) {
            console.log("Message routing error:", err.message);
        }
    });

    return sock;
}

// 🌐 WEB PAIRING ENDPOINT
app.post("/api/pair", async (req, res) => {
    let { num } = req.body;
    if (!num) return res.status(400).json({ error: "Phone number is required." });

    const cleanNum = num.replace(/[^0-9]/g, "");
    const sessionPath = path.join(config.SESSIONS_DIR, `num_${cleanNum}`);

    try {
        if (fs.existsSync(path.join(sessionPath, "creds.json"))) {
            const creds = JSON.parse(fs.readFileSync(path.join(sessionPath, "creds.json")));
            if (creds.registered) {
                if (!activeSockets.has(cleanNum)) startBot(cleanNum);
                return res.status(400).json({ error: "This phone number is already actively connected!" });
            }
        }

        let currentSock = activeSockets.get(cleanNum);
        if (!currentSock) {
            currentSock = await startBot(cleanNum);
        }

        let retries = 0;
        while (!currentSock.authState.creds.registrationId && retries < 10) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            retries++;
        }

        const code = await currentSock.requestPairingCode(cleanNum);
        return res.json({ success: true, code: code });

    } catch (err) {
        return res.status(500).json({ error: `Server pairing failed: ${err.message}` });
    }
});

// HTML Interface (Hardcoded with Dev Identity Overlays)
app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${config.APP_TITLE}</title>
        <script src="https://jsdelivr.net"></script>
    </head>
    <body class="bg-slate-950 text-slate-100 flex flex-col items-center justify-center min-h-screen font-sans">
        <div class="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl mx-4 relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-indigo-600 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-bl-xl border-l border-b border-indigo-500/30">
                Dev: ${config.DEV_NAME}
            </div>
            <div class="text-center mb-6 mt-2">
                <h1 class="text-2xl font-black tracking-wider text-indigo-400">${config.APP_TITLE}</h1>
                <p class="text-sm text-slate-400 mt-1">${config.SUBTITLE}</p>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Phone Number</label>
                    <input type="text" id="phone" placeholder="Include country code, e.g. 88017XXXXXXXX" 
                        class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-center font-mono text-lg tracking-widest text-white">
                </div>
                <button id="btn" onclick="getPairCode()" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl transition-all cursor-pointer">
                    Generate Unique Link Code
                </button>
            </div>
            <div id="resultBox" class="hidden mt-6 p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                <p class="text-xs text-slate-400 uppercase tracking-widest mb-2">Your Pairing Code</p>
                <div id="codeDisplay" class="text-3xl font-mono font-bold tracking-widest text-emerald-400 select-all">----</div>
            </div>
            <div id="errorBox" class="hidden mt-4 p-3 bg-rose-950/40 border border-rose-900/50 text-rose-300 text-sm rounded-xl text-center"></div>
            <div class="mt-6 text-center border-t border-slate-800/60 pt-4">
                <p class="text-[11px] text-slate-500 tracking-wide font-medium">Engine Orchestration Auth Guarded by <span class="text-indigo-400 font-semibold">${config.DEV_NAME}</span></p>
            </div>
        </div>
        <script>
            async function getPairCode() {
                const phoneInput = document.getElementById("phone");
                const btn = document.getElementById("btn");
                const resultBox = document.getElementById("resultBox");
                const codeDisplay = document.getElementById("codeDisplay");
                const errorBox = document.getElementById("errorBox");

                errorBox.classList.add("hidden");
                resultBox.classList.add("hidden");

                if (!phoneInput.value.trim()) {
                    errorBox.innerText = "Please input a phone number.";
                    errorBox.classList.remove("hidden");
                    return;
                }

                btn.innerText = "Spawning Instance...";
                btn.disabled = true;

                try {
                    const response = await fetch("/api/pair", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ num: phoneInput.value.trim() })
                    });
                    
                    const data = await response.json();
                    
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || "Failed to generate pair code.");
                    }
                    
                    codeDisplay.innerText = data.code;
                    resultBox.classList.remove("hidden");
                } catch (err) {
                    errorBox.innerText = err.message;
                    errorBox.classList.remove("hidden");
                } finally {
                    btn.innerText = "Generate Unique Link Code";
                    btn.disabled = false;
                }
            }
        </script>
    </body>
    </html>
    `);
});

app.listen(config.PORT, () => {
    console.log(`🌐 System Live Online Deployment Activated on Port: ${config.PORT}`);
});
