import { ChatInputCommandInteraction } from "discord.js";
import { handlePing } from "./ping";
import { handleRoleAdd, handleRoleRemove } from "./role";

const handlers: Record<string, (i: ChatInputCommandInteraction) => Promise<void>> = {
  ping: handlePing,
  role: handleRoleAdd,
  unrole: handleRoleRemove,
};

export async function handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  const handler = handlers[interaction.commandName];
  if (handler) await handler(interaction);
}
