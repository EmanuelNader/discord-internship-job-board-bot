import type { Client } from "discord.js";
import type { PrismaClient } from "@prisma/client";

export class Poster {
  constructor(private client: Client, private prisma: PrismaClient) {}

  async send(posting: any): Promise<void> {
    console.log("Poster.send stub");
  }
}
