const fs = require("fs");
const path = require("path");

const pluginsDir = path.join(__dirname, "plugins");

// Load all plugins once
const plugins = [];

function loadPlugins() {
    plugins.length = 0;

    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir);
    }

    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith(".js"));

    for (const file of files) {
        try {
            const plugin = require(path.join(pluginsDir, file));

            if (plugin && plugin.command && plugin.execute) {
                plugins.push(plugin);
                console.log(`🧩 Loaded plugin: ${file}`);
            } else {
                console.log(`⚠️ Invalid plugin skipped: ${file}`);
            }
        } catch (err) {
            console.log(`❌ Failed to load plugin ${file}:`, err.message);
        }
    }
}

// Initial explicit invocation
loadPlugins();

// Simple reload helper 
function reloadPlugins() {
    // Clear cache of all files inside the plugins folder
    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith(".js"));
    for (const file of files) {
        delete require.cache[require.resolve(path.join(pluginsDir, file))];
    }
    delete require.cache[require.resolve(__filename)];
    loadPlugins();
}

// 🎯 MAIN FUNCTION HANDLER
async function handler(sock, m, text) {
    try {
        const jid = m.key.remoteJid;
        if (!text) return;

        const args = text.trim().split(/ +/);
        const cmd = args[0].toLowerCase();
        const params = args.slice(1);

        // Loop through loaded functional plugins
        for (const plugin of plugins) {
            const commands = Array.isArray(plugin.command)
                ? plugin.command
                : [plugin.command];

            // Strip prefix or non-alphanumeric chars to match command definition strings safely
            if (commands.includes(cmd.replace(/[^a-z0-9]/gi, ""))) {
                try {
                    await plugin.execute(sock, m, params, {
                        jid,
                        text,
                        command: cmd,
                        args: params
                    });
                } catch (err) {
                    console.log(`❌ Plugin error (${cmd}):`, err.message);
                    await sock.sendMessage(jid, {
                        text: "⚠️ Plugin error occurred."
                    });
                }
                return; // Match found, terminate evaluation loop
            }
        }
    } catch (e) {
        console.log("Handler inner runtime execution error:", e.message);
    }
}

// 📦 Standard Functional hybrid export structure to be completely bulletproof
module.exports = handler;
module.exports.handler = handler;
module.exports.default = handler;
module.exports.reloadPlugins = reloadPlugins;
