import { me, stop } from "@/service/bot";
import fs from "fs";
import { getFeed, sendFeed } from "@/service/feed";
import "../logger";
let botusername: string | null = null;
let interval: NodeJS.Timeout;

const main = async () => {
  try {
    let fileData: BotData;

    if (botusername == null) {
      try {
        botusername = await me;
        console.log("[SERVICE]", "Bot started as ", botusername);
      } catch (error) {
        console.error(
          "[SERVICE]",
          "[ERROR]",
          "Failed to get bot username:",
          error,
        );
        throw error;
      }
    }

    if (!fs.existsSync("./data")) {
      fs.mkdirSync("./data");
    }

    if (fs.existsSync("./data/data.json")) {
      const data = fs.readFileSync("./data/data.json");

      fileData = JSON.parse(data.toString()) as BotData;

      const { lastFetch, channels, feedUrl } = fileData;

      console.log("[SERVICE]", "Running News fetch...");
      const rss = JSON.parse(
        fs.readFileSync("./service/rss.json").toString(),
      ) as { category: string; rss: string }[];

      const category = rss.find((f) => f.rss == feedUrl)?.category;

      if (channels.length == 0) {
        console.log(
          "[SERVICE]",
          "No Channels added, add @" + botusername + " to your channel",
        );
        console.log("[SERVICE]", "[OK]", "SERVICE STARTED");

        return;
      }

      const { feed, last } = (await getFeed(
        category ?? "Crypto",
      )) as FeedResult;
      console.log("[SERVICE]", `${feed.length} fetched.`);

      if (!feed) {
        console.log("[SERVICE]", "Feed is undefined!");
        return;
      }

      const filteredFeeds = feed.filter((item) => {
        if (!item.pubDate) return false;
        const itemDate = new Date(item.pubDate).getTime();
        const lastFetchDate = new Date(lastFetch).getTime();
        return itemDate > lastFetchDate;
      });
      console.log("[SERVICE]", `${filteredFeeds.length} item will be send.`);

      fileData.lastFetch = last;
      fs.writeFileSync("./data/data.json", JSON.stringify(fileData));
      console.log("[SERVICE]", "Update last fetched time.");

      console.log("[SERVICE]", "[OK]", "SERVICE STARTED");

      if (filteredFeeds.length == 0) return;

      const reversedFeeds = filteredFeeds.reverse();
      await sendFeed(
        channels,
        reversedFeeds,
        botusername,
        category ?? "Milkie",
      );
    } else {
      console.log("[SERVICE]", "[ERROR]", "Missin data file");
      throw new Error("Missing DATA file");
    }
  } catch (error) {
    console.log("[SERVICE]", "[ERROR]", (error as Error).message);
  }
};

process.on("SIGTERM", async () => {
  console.log("[SERVICE]", "Gracefully shutting down...");
  clearInterval(interval);
  // Add this line to stop your bot (adjust based on how your bot is exported)
  stop();
  process.exit(0);
});

main();

//run every 5 minutes!
interval = setInterval(main, 5 * 60 * 1000);
