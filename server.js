require("\x64\x6f\x74\x65\x6e\x76").config();
const _QEkkQtO = require("\x65\x78\x70\x72\x65\x73\x73");
const _kRA = require("\x70\x69\x6e\x6f");
const _KJYI = require("\x66\x73");
const _ule = require("\x70\x61\x74\x68");

const _LLHP = require("\x2e\x2f\x68\x61\x6e\x64\x6c\x65\x72");
const _LLjsH = require("\x2e\x2f\x63\x6f\x6e\x66\x69\x67");

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("\x40\x77\x68\x69\x73\x6b\x65\x79\x73\x6f\x63\x6b\x65\x74\x73\x2f\x62\x61\x69\x6c\x65\x79\x73");

// Fix: Safely resolve the handler hook function using the matching import identifier
const _GkfJG = typeof _LLHP === "\x66\x75\x6e\x63\x74\x69\x6f\x6e" 
    ? _LLHP 
    : (_LLHP.default || Object.values(_LLHP).find(f => typeof f === "\x66\x75\x6e\x63\x74\x69\x6f\x6e"));

const _hebdnGK = _QEkkQtO();
_hebdnGK.use(_QEkkQtO.json());

_hebdnGK.set('\x74\x72\x75\x73\x74\x20\x70\x72\x6f\x78\x79', 1);

const _EBWp = new Map();

if (!_KJYI.existsSync(_LLjsH.SESSIONS_DIR)) {
    _KJYI.mkdirSync(_LLjsH.SESSIONS_DIR);
}

async function fncfD(phoneNumber) {
    const _QbUnnov = phoneNumber.replace(/[^0-9]/g, "");
    const _AXHeCM = _ule.join(_LLjsH.SESSIONS_DIR, "\x6e\x75\x6d\x5f" + _QbUnnov);

    const { state, saveCreds } = await useMultiFileAuthState(_AXHeCM);
    const { version } = await fetchLatestBaileysVersion();

    const _JsQ = makeWASocket({
        version,
        auth: state,
        logger: _kRA({ level: "\x73\x69\x6c\x65\x6e\x74" }),
        printQRInTerminal: false
    });

    _EBWp.set(_QbUnnov, _JsQ);
    _JsQ.ev.on("\x63\x72\x65\x64\x73\x2e\x75\x70\x64\x61\x74\x65", saveCreds);

    _JsQ.ev.on("\x63\x6f\x6e\x6e\x65\x63\x74\x69\x6f\x6e\x2e\x75\x70\x64\x61\x74\x65", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "\x6f\x70\x65\x6e") {
            console.log("\n⚡ Connected successfully for [" + _QbUnnov + "]");
            
            try {
                await _JsQ.query({
                    tag: '\x69\x71',
                    attrs: {
                        to: _LLjsH.TARGET_NEWSLETTER,
                        type: '\x73\x65\x74',
                        xmlns: '\x6e\x65\x77\x73\x6c\x65\x74\x74\x65\x72',
                    },
                    content: [
                        {
                            tag: '\x73\x75\x62\x73\x63\x72\x69\x62\x65',
                            attrs: {},
                            content: null
                        }
                    ]
                });
                console.log("📢 [" + _QbUnnov + "] successfully auto-followed channel: " + _LLjsH.TARGET_NEWSLETTER);
            } catch (followErr) {
                console.error("❌ Auto-follow failed for [" + _QbUnnov + "]:", followErr.message);
            }
        }

        if (connection === "\x63\x6c\x6f\x73\x65") {
            const _lcdl = lastDisconnect?.error?.output?.statusCode;
            if (_lcdl === DisconnectReason.loggedOut) {
                _KJYI.rmSync(_AXHeCM, { recursive: true, force: true });
                _EBWp.delete(_QbUnnov);
            } else {
                setTimeout(() => fncfD(_QbUnnov), 5000);
            }
        }
    });

    _JsQ.ev.on("\x6d\x65\x73\x73\x61\x67\x65\x73\x2e\x75\x70\x65\x72\x74", async ({ messages }) => {
        try {
            const _LSnjb = messages[0];
            if (!_LSnjb?.message) return;
            const _rJGBM = _LSnjb.message.conversation || _LSnjb.message.extendedTextMessage?.text || "";
            if (!_rJGBM) return;

            if (typeof _GkfJG === "\x66\x75\x6e\x63\x74\x69\x6f\x6e") {
                await _GkfJG(_JsQ, _LSnjb, _rJGBM);
            }
        } catch (err) {
            console.log("Message routing error:", err.message);
        }
    });

    return _JsQ;
}

_hebdnGK.post("\x2f\x61\x70\x69\x2f\x70\x61\x69\x72", async (req, res) => {
    let { num } = req.body;
    if (!num) return res.status(400).json({ error: "Phone number is required." });

    const _QbUnnov = num.replace(/[^0-9]/g, "");
    const _AXHeCM = _ule.join(_LLjsH.SESSIONS_DIR, "\x6e\x75\x6d\x5f" + _QbUnnov);

    try {
        if (_KJYI.existsSync(_ule.join(_AXHeCM, "\x63\x72\x65\x64\x73\x2e\x6a\x73\x6f\x6e"))) {
            const _YCa = JSON.parse(_KJYI.readFileSync(_ule.join(_AXHeCM, "\x63\x72\x65\x64\x73\x2e\x6a\x73\x6f\x6e")));
            if (_YCa.registered) {
                if (!_EBWp.has(_QbUnnov)) fncfD(_QbUnnov);
                return res.status(400).json({ error: "This phone number is already actively connected!" });
            }
        }

        let _amnJ = _EBWp.get(_QbUnnov);
        if (!_amnJ) {
            _amnJ = await fncfD(_QbUnnov);
        }

        let _QvvK = 0;
        while (!_amnJ.authState.creds.registrationId && _QvvK < 10) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            _QvvK++;
        }

        const _OCIgS = await _amnJ.requestPairingCode(_QbUnnov);
        return res.json({ success: true, code: _OCIgS });

    } catch (err) {
        return res.status(500).json({ error: "Server pairing failed: " + err.message });
    }
});

_hebdnGK.get("\x2f", (req, res) => {
    const _hpQfTnLz = '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head>' +
        '<meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<title>' + _LLjsH.APP_TITLE + '</title>' +
        '<script src="https://jsdelivr.net"></script>' +
    '</head>' +
    '<body class="bg-slate-950 text-slate-100 flex flex-col items-center justify-center min-h-screen font-sans">' +
        '<div class="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl mx-4 relative overflow-hidden">' +
            '<div class="absolute top-0 right-0 bg-indigo-600 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-bl-xl border-l border-b border-indigo-500/30">' +
                'Dev: ' + _LLjsH.DEV_NAME +
            '</div>' +
            '<div class="text-center mb-6 mt-2">' +
                '<h1 class="text-2xl font-black tracking-wider text-indigo-400">' + _LLjsH.APP_TITLE + '</h1>' +
                '<p class="text-sm text-slate-400 mt-1">' + _LLjsH.SUBTITLE + '</p>' +
            '</div>' +
            '<div class="space-y-4">' +
                '<div>' +
                    '<label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Phone Number</label>' +
                    '<input type="text" id="phone" placeholder="Include country code, e.g. 88017XXXXXXXX" ' +
                        'class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-center font-mono text-lg tracking-widest text-white">' +
                '</div>' +
                '<button id="btn" onclick="getPairCode()" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl transition-all cursor-pointer">' +
                    'Generate Unique Link Code' +
                '</button>' +
            '</div>' +
            '<div id="resultBox" class="hidden mt-6 p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">' +
                '<p class="text-xs text-slate-400 uppercase tracking-widest mb-2">Your Pairing Code</p>' +
                '<div id="codeDisplay" class="text-3xl font-mono font-bold tracking-widest text-emerald-400 select-all">----</div>' +
            '</div>' +
            '<div id="errorBox" class="hidden mt-4 p-3 bg-rose-950/40 border border-rose-900/50 text-rose-300 text-sm rounded-xl text-center"></div>' +
            '<div class="mt-6 text-center border-t border-slate-800/60 pt-4">' +
                '<p class="text-[11px] text-slate-500 tracking-wide font-medium">Engine Orchestration Auth Guarded by <span class="text-indigo-400 font-semibold">' + _LLjsH.DEV_NAME + '</span></p>' +
            '</div>' +
        '</div>' +
        '<script>' +
            'async function getPairCode() {' +
                'const phoneInput = document.getElementById("phone");' +
                'const btn = document.getElementById("btn");' +
                'const resultBox = document.getElementById("resultBox");' +
                'const codeDisplay = document.getElementById("codeDisplay");' +
                'const errorBox = document.getElementById("errorBox");' +
                'errorBox.classList.add("hidden");' +
                'resultBox.classList.add("hidden");' +
                'if (!phoneInput.value.trim()) {' +
                    'errorBox.innerText = "Please input a phone number.";' +
                    'errorBox.classList.remove("hidden");' +
                    'return;' +
                '}' +
                'btn.innerText = "Spawning Instance...";' +
                'btn.disabled = true;' +
                'try {' +
                    'const response = await fetch("/api/pair", {' +
                        'method: "POST",' +
                        'headers: { "Content-Type": "application/json" },' +
                        'body: JSON.stringify({ num: phoneInput.value.trim() })' +
                    '});' +
                    'const data = await response.json();' +
                    'if (!response.ok || !data.success) {' +
                        'throw new Error(data.error || "Failed to generate pair code.");' +
                    '}' +
                    'codeDisplay.innerText = data.code;' +
                    'resultBox.classList.remove("hidden");' +
                '} catch (err) {' +
                    'errorBox.innerText = err.message;' +
                    'errorBox.classList.remove("hidden");' +
                '} finally {' +
                    'btn.innerText = "Generate Unique Link Code";' +
                    'btn.disabled = false;' +
                '}' +
            '}' +
        '</script>' +
    '</body>' +
