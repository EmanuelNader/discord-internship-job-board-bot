import { EmbedBuilder } from "discord.js";

const LEVEL_COLORS: Record<string, number> = {
  internship: 0x00ff00,
  "co-op": 0x3498db,
  fellowship: 0x9b59b6,
};

function formatPostedDate(date?: Date): string {
  if (!date) return "unknown";
  // Use UTC to avoid timezone issues
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

interface EmbedInput {
  title: string;
  company: string;
  location: string | null;
  url: string;
  level: string;
  sourceName: string;
  roleFamily: string[];
  roleTitles: string[];
  postedAt?: Date;
}

export function buildPostingEmbed(input: EmbedInput): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(input.title)
    .setURL(input.url)
    .setColor(LEVEL_COLORS[input.level] ?? 0x808080)
    .addFields(
      { name: "Company", value: input.company, inline: true },
      { name: "Location", value: input.location ?? "Unspecified", inline: true },
      { name: "Level", value: input.level.charAt(0).toUpperCase() + input.level.slice(1), inline: true },
      { name: "Source", value: input.sourceName, inline: true },
    );

  if (input.roleTitles.length > 0) {
    embed.addFields({ name: "Roles", value: input.roleTitles.map((r) => `\`${r}\``).join(", ") });
  }

  embed.addFields({ name: "Posted", value: formatPostedDate(input.postedAt), inline: false });

  return embed;
}
