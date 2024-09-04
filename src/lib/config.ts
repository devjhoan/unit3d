import type { Config } from "@/types/config";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

export const config = parse(
	readFileSync("config/config.yml", "utf8"),
) as Config;
