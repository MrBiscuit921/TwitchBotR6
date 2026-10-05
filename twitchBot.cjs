// Load environment variables
require("dotenv").config();

// Import dependencies
const tmi = require("tmi.js");
const {fetchR6Stats} = require("./r6Stats.cjs"); // <-- your exported function

// --- Twitch Client Setup ---
const client = new tmi.Client({
  options: {debug: true},
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN,
  },
  channels: [process.env.TWITCH_CHANNEL],
});

// Connect to Twitch
client.connect().catch((err) => {
  console.error("Failed to connect:", err);
});

// --- Handle incoming messages ---
client.on("message", async (channel, tags, message, self) => {
  // Ignore messages from the bot itself
  if (self) return;

  // Check if the message starts with !stats
  if (message.toLowerCase().startsWith("!stats")) {
    // Split the command: "!stats username" -> ["!stats", "username"]
    const args = message.split(" ");
    const username = args[1]?.trim() || "PsycoName";

    try {
      // Call your existing function – adjust if it returns a string or object
      const statsString = await fetchR6Stats(username, "uplay");

      if (!statsString) {
        client.say(
          channel,
          `@${tags.username}, player "${username}" not found or an error occurred.`,
        );
        return;
      }

      // Send the formatted stats to chat
      // (Make sure statsString is short enough for Twitch's 500-character limit)
      client.say(channel, `@${tags.username}, ${statsString}`);
    } catch (error) {
      console.error("Error fetching stats:", error);
      client.say(
        channel,
        `@${tags.username}, something went wrong while fetching stats.`,
      );
    }
  }
});

// Optional: log when the bot is ready
client.on("connected", () => {
  console.log(`Bot connected to ${process.env.TWITCH_CHANNEL}`);
});

// Keep Render alive – start a tiny HTTP server
const http = require("http");
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("R6 Bot is running!");
});
server.listen(8080, () => {
  console.log("HTTP server running on port 8080");
});
