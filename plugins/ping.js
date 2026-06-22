module.exports = {
    command: "ping", // Strips out prefix automatically (matches .ping, !ping, etc.)
    async execute(sock, m, args, { jid }) {
        await sock.sendMessage(jid, { text: "🏓 Pong! System online." });
    }
};
