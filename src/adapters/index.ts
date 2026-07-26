import type { SourceAdapter, SourceName } from "@/lib/types";
import { createGreenhouseAdapter } from "./greenhouse";
import { createAshbyAdapter } from "./ashby";
import { createLeverAdapter } from "./lever";
import { createWorkdayAdapter } from "./workday";
import { createSimplifyAdapter } from "./simplify";
import { createGithubAdapter } from "./github";

const adapterFactories: Record<SourceName, () => SourceAdapter> = {
  greenhouse: createGreenhouseAdapter,
  ashby: createAshbyAdapter,
  lever: createLeverAdapter,
  workday: createWorkdayAdapter,
  simplify: createSimplifyAdapter,
  github: createGithubAdapter,
};

export function createAdapter(name: SourceName): SourceAdapter {
  const factory = adapterFactories[name];
  if (!factory) throw new Error(`Unknown adapter: ${name}`);
  return factory();
}

export function getAllAdapters(): SourceAdapter[] {
  return (Object.keys(adapterFactories) as SourceName[]).map(createAdapter);
}