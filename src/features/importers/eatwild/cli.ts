import "server-only";
import type { EatwildImportOptions } from "./types";

export function parseEatwildCliArgs(argv: string[]): EatwildImportOptions {
  const options: EatwildImportOptions = {};

  for (const arg of argv) {
    if (arg.startsWith("--state=")) {
      options.state = arg.split("=")[1];
    }
    if (arg === "--all-states") {
      options.allStates = true;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
    }
    if (arg === "--confirm-national-import") {
      options.confirmNationalImport = true;
    }
  }

  return options;
}
