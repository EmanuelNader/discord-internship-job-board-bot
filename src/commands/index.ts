import { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import { handlePing } from "./ping";
import { handleRoleAdd, handleRoleRemove, handleRoleAutocomplete } from "./role";
import { handleStatus } from "./status";
import { handleLinkChannel } from "./linkchannel";
import { handleSetup } from "./setup";

const handlers: Record<string, (i: ChatInputCommandInteraction) => Promise<void>> = {
  ping: handlePing,
  role: handleRoleAdd,
  unrole: handleRoleRemove,
  status: handleStatus,
  linkchannel: handleLinkChannel,
  setup: handleSetup,
};

export async function handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  const handler = handlers[interaction.commandName];
  if (handler) {
    await handler(interaction);
  } else {
    await interaction.reply({ content: "Unknown command.", ephemeral: true });
  }
}

export async function handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  if (interaction.commandName === "role" || interaction.commandName === "unrole") {
    await handleRoleAutocomplete(interaction);
  }
}