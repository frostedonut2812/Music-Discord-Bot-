const dotenv = require('dotenv');
dotenv.config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content === "hi bot") {
        message.reply({ content: "hi From Bot" });
        return;
    }

    if (message.content === "!help") {
        message.reply({
            content: `**Bot Commands:**\n\n` +
                `!help - Show this help message\n` +
                `hi bot - Greet the bot\n` +
                `!song <song name> - Find the top YouTube music video for a song name`
        });
        return;
    }

    if (message.content.startsWith("!song ")) {
        const query = message.content.replace("!song ", "").trim();
        if (!query) {
            message.reply({ content: "Please provide a song name!" });
            return;
        }


        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                const videoId = data.items[0].id.videoId;
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                message.reply({ content: `Top result for "${query}":\n${videoUrl}` });
            } else {
                message.reply({ content: "No results found!" });
            }
        } catch (error) {
            message.reply({ content: "Error searching YouTube." });
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);