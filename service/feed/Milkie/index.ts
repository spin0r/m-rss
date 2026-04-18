import { send, bot } from "@/service/bot";
import Parser from "rss-parser";
import "../../../logger";
import { DATA_PATH } from "@/dashboard";
import fs from "fs";

const FEED_URL: string = (
  JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as BotData
).feedUrl;

const parser = new Parser({
  customFields: {
    item: ["media:content", "enclosure", "description"],
  },
});

const getRawFeed = async () => {
  try {
    const feed = await parser.parseURL(FEED_URL);
    return feed;
  } catch (error) {
    throw error;
  }
};

export const getFeed = async (): Promise<FeedResult> => {
  try {
    const feed = await getRawFeed();

    const result: Partial<Feed>[] = feed.items.map((item: any) => {
      const {
        title,
        link,
        pubDate,
        description,
        categories,
        enclosure,
        ["media:content"]: media,
      } = item as any;

      let tags: string[] = [];

      if (categories) {
        tags = Array.isArray(categories)
          ? categories
          : [categories].filter((tag) => tag !== null);
      }

      // Extract size and files from description
      // Format: "Size: 10 GB Files: 6"
      let size: string | undefined;
      let files: number | undefined;

      if (description) {
        const sizeMatch = description.match(/Size:\s*([0-9.]+\s*[A-Z]+)/i);
        const filesMatch = description.match(/Files:\s*(\d+)/i);

        if (sizeMatch) {
          size = sizeMatch[1];
        }
        if (filesMatch) {
          files = parseInt(filesMatch[1]);
        }
      }

      // Get media URL from enclosure or media:content
      let mediaUrl = null;
      if (enclosure && enclosure.url) {
        mediaUrl = enclosure.url;
      } else if (media && media.$ && media.$.url) {
        mediaUrl = media.$.url;
      }

      return {
        title,
        link,
        pubDate,
        tags,
        size,
        files,
        media: {
          url: mediaUrl,
          type: enclosure?.type || (media ? media.$.type : null),
          width: media ? media.$.width : null,
          height: media ? media.$.height : null,
        },
      };
    });

    const lastPubDate = result.reduce((latest, item) => {
      if (!item.pubDate) return latest;

      const itemDate = new Date(item.pubDate).getTime();
      return itemDate > latest ? itemDate : latest;
    }, 0);

    const last = new Date(lastPubDate).toISOString();

    return { feed: result, last };
  } catch (error) {
    console.error("[SERVICE]", "[ERROR]", (error as Error).message);
    return { feed: [], last: new Date(0).toISOString() };
  }
};

export const sendFeed = async (
  channels: {
    channel: string;
    title: string;
  }[],
  feeds: Partial<Feed>[],
  botusername: string,
) => {
  for (const channel of channels) {
    for (const filteredFeed of feeds) {
      if (!filteredFeed.title) return;

      const title = filteredFeed.title.replace(/[.\-]/g, " ");

      let browseLink = filteredFeed.link || "";
      const torrentIdMatch = browseLink.match(/\/torrents\/([^\/]+)\//);
      if (torrentIdMatch) {
        browseLink = `https://milkie.cc/browse/${torrentIdMatch[1]}`;
      }

      const escapeHtml = (text: string) => {
        return text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

      const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        };
        return date.toLocaleString("en-US", options).replace(" at ", " at ");
      };

      let readyCaption: string = "";

      readyCaption += `💦 <a href="${escapeHtml(browseLink)}"><b>${escapeHtml(title)}</b></a>\n\n`;

      if (filteredFeed.pubDate) {
        readyCaption += `🕗 <code>${formatDate(filteredFeed.pubDate)}</code>\n\n`;
      }

      if (filteredFeed.size || filteredFeed.files) {
        let sizeFilesLine = "";
        if (filteredFeed.size) {
          sizeFilesLine += `📦 Size: ${filteredFeed.size}`;
        }
        if (filteredFeed.files) {
          if (sizeFilesLine) sizeFilesLine += " | ";
          sizeFilesLine += `📁 Files: ${filteredFeed.files}`;
        }
        readyCaption += `<code>${sizeFilesLine}</code>\n\n`;
      }

      if (filteredFeed.tags && filteredFeed.tags.length > 0) {
        filteredFeed.tags.forEach((tag) => {
          readyCaption += "#" + tag.trim().replace(/\s+/g, "_") + " ";
        });
        readyCaption += "\n";
      }

      if (filteredFeed.media?.url) {
        send(filteredFeed.media.url, readyCaption, channel.channel);
      } else {
        try {
          await bot.telegram.sendMessage(channel.channel, readyCaption, {
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true },
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "View on Milkie",
                    url: browseLink,
                  },
                ],
              ],
            },
          });
        } catch (error) {
          console.error("Error sending message:", error);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};
