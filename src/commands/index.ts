import { ChatInputCommandInteraction } from "discord.js";
import { handlePing } from "./ping";
import { handleRoleAdd, handleRoleRemove } from "./role";
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
  if (handler) await handler(interaction);
}
