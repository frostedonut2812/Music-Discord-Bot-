const dotenv = require('dotenv');
dotenv.config();
const { Client, GatewayIntentBits } = require("discord.js");
const fetch = global.fetch || require('node-fetch'); 
const LRU = require('lru-cache');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const userRequests = new Map();
const RATE_LIMIT = {
    maxRequests: 5,
    timeWindow: 60000,
};

const searchCache = new LRU({
  max: 500,      
  ttl: 3600000,    
});

function isRateLimited(userId) {
    const now = Date.now();
    const userData = userRequests.get(userId) || { count: 0, resetTime: now + RATE_LIMIT.timeWindow };
    
    if (now > userData.resetTime) {
        userData.count = 0;
        userData.resetTime = now + RATE_LIMIT.timeWindow;
    }
    
    if (userData.count >= RATE_LIMIT.maxRequests) {
        return true;
    }
    
    userData.count++;
    userRequests.set(userId, userData);
    return false;
}

function getCachedResult(query) {
    const cacheKey = query.toLowerCase().trim();
    const cached = searchCache.get(cacheKey);
    return cached || null;
}

function setCachedResult(query, result) {
    const cacheKey = query.toLowerCase().trim();
    searchCache.set(cacheKey, result);
}

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
        if (isRateLimited(message.author.id)) {
            const remainingTime = Math.ceil((userRequests.get(message.author.id).resetTime - Date.now()) / 1000);
            message.reply({ 
                content: `Rate limit exceeded! Please wait ${remainingTime} seconds before making another request.` 
            });
            return;
        }

        const query = message.content.replace("!song ", "").trim();
        if (!query) {
            message.reply({ content: "Please provide a song name!" });
            return;
        }

        const cachedResult = getCachedResult(query);
        if (cachedResult) {
            message.reply({ content: `Top result for "${query}":\n${cachedResult}` });
            return;
        }

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                const videoId = data.items[0].id.videoId;
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                setCachedResult(query, videoUrl);
                message.reply({ content: `Top result for "${query}":\n${videoUrl}` });
            } else {
                setCachedResult(query, "No results found!");
                message.reply({ content: "No results found!" });
            }
        } catch (error) {
            console.error("YouTube search error:", error);
            setCachedResult(query, "Error searching YouTube.");
            message.reply({ content: "Error searching YouTube." });
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
