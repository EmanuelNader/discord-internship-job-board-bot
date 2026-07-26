import { describe, it, expect, vi } from "vitest";
import { handlePing } from "@/commands/ping";

describe("handlePing", () => {
  it("replies with pong and latency", async () => {
    const reply = vi.fn();
    const interaction = {
      createdTimestamp: Date.now() - 42,
      reply,
    } as any;

    await handlePing(interaction);
    expect(reply).toHaveBeenCalledWith(expect.stringMatching(/Pong! Latency: \d+ms/));
  });
});
