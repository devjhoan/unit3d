import type { Config } from "@/types/config";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";

export const config = load(readFileSync("config/config.yml", "utf8")) as Config;
