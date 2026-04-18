import { Telegraf, Context } from "telegraf";
import fs from "fs";
import path from "path";
import "../../logger";
import { Chat } from "telegraf/typings/core/types/typegram";

const configPath = path.join(process.cwd(), "data", "config.json");
const dataPath = path.join(process.cwd(), "data", "data.json");
const rssPath = path.join(process.cwd(), "service", "rss.json");

console.log("[SERVICE]", "Loading config from:", configPath);

if (!fs.existsSync(configPath)) {
  console.error(
    "[SERVICE]",
    "[ERROR]",
    "Config file not found at:",
    configPath,
  );
  process.exit(1);
}

const config: ConfigData = JSON.parse(fs.readFileSync(configPath, "utf-8"));

if (!config.botToken) {
  console.error("[SERVICE]", "[ERROR]", "Bot token not found in config");
  process.exit(1);
}

console.log("[SERVICE]", "Bot token loaded, length:", config.botToken.length);

export const bot: Telegraf<Context> = new Telegraf(config.botToken);
export const me = bot.telegram.getMe().then((me) => me.username);

bot.start(async (ctx) => {
  ctx.reply("Hello! " + ctx.from?.username);
});

// Test command to send latest 5 RSS items
bot.command("test", async (ctx) => {
  try {
    const dataString = fs.readFileSync(dataPath);
    const data = JSON.parse(dataString.toString()) as BotData;
    const { channels, feedUrl } = data;

    if (channels.length === 0) {
      ctx.reply(
        "No channels configured. Please add the bot to a channel first.",
      );
      return;
    }

    // Import feed functions dynamically
    const rss = JSON.parse(fs.readFileSync(rssPath).toString()) as {
      category: string;
      rss: string;
    }[];

    const category = rss.find((f) => f.rss === feedUrl)?.category || "Milkie";

    // Dynamically import the feed module
    const { getFeed, sendFeed } = await import(`../feed/${category}`);

    const { feed } = (await getFeed()) as FeedResult;

    if (!feed || feed.length === 0) {
      ctx.reply("No RSS items found.");
      return;
    }

    // Get latest 5 items
    const latestItems = feed.slice(0, 5);

    ctx.reply(`Sending ${latestItems.length} test items...`);

    const username = await me;

    // Send to all channels
    await sendFeed(channels, latestItems, username);

    ctx.reply("Test items sent successfully!");
  } catch (error) {
    console.error("[SERVICE]", "[ERROR]", "Test command failed:", error);
    ctx.reply("Failed to send test items. Check logs for details.");
  }
});

// on added to a channel or group
bot.on("my_chat_member", async (ctx) => {
  const chatMember = ctx.myChatMember;
  const id = chatMember.chat.id;

  const channelInfo = (await ctx.telegram.getChat(id)) as Chat.ChannelGetChat;

  const title = channelInfo.title;

  const dataString = fs.readFileSync(dataPath);
  const data = JSON.parse(dataString.toString()) as BotData;
  const { channels } = data;

  if (chatMember.new_chat_member.status === "administrator") {
    console.log("[SERVICE]", "Channel added ", title);
    channels.push({ channel: id.toString(), title });
  } else if (chatMember.new_chat_member.status === "left") {
    const index = channels.findIndex((ch) => ch.channel === id.toString());
    if (index > -1) {
      console.log("[SERVICE]", "Channel removed ", title);
      channels.splice(index, 1);
    }
  }

  fs.writeFileSync(dataPath, JSON.stringify(data));
});

bot
  .launch()
  .then(() => {
    console.log("[SERVICE]", "Bot launched successfully");
  })
  .catch((error) => {
    console.error(
      "[SERVICE]",
      "[ERROR]",
      `Error Starting BOT: ${error.message}`,
    );
    console.error("[SERVICE]", "[ERROR]", "Full error:", error);
    process.exit(1);
  });

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

export const stop = () => {
  bot.stop();
  console.log("[SERVICE]", "Bot instance stopped.");
};

export const send = async (imageUrl: string, text: string, _to: string) => {
  try {
    await bot.telegram.sendPhoto(_to, imageUrl, {
      caption: text,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.log("[SERVICE]", "[ERROR]", (error as Error).message, text);
  }
};

export {};
