import type { SourceAdapter, SourceName } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";
import { createGreenhouseAdapter } from "./greenhouse";
import { createAshbyAdapter } from "./ashby";
import { createLeverAdapter } from "./lever";
import { createWorkdayAdapter } from "./workday";
import { createSimplifyAdapter } from "./simplify";
import { createGithubAdapter } from "./github";
import { createCustomAdapter } from "./custom";

const adapterFactories: Record<SourceName, () => SourceAdapter> = {
  greenhouse: createGreenhouseAdapter,
  ashby: createAshbyAdapter,
  lever: createLeverAdapter,
  workday: createWorkdayAdapter,
  simplify: createSimplifyAdapter,
  github: createGithubAdapter,
  custom: createCustomAdapter,
};

export function createAdapter(name: SourceName): SourceAdapter {
  const factory = adapterFactories[name];
  if (!factory) throw new Error(`Unknown adapter: ${name}`);
  return factory();
}

export function getAllAdapters(): SourceAdapter[] {
  const enabled = new Set(adapterConfigs.filter((c) => c.enabled).map((c) => c.name));
  return (Object.keys(adapterFactories) as SourceName[])
    .filter((name) => enabled.has(name))
    .map(createAdapter);
}