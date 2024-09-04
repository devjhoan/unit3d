import { parse, parseDocument, type Document } from "yaml";
import updateData from "./update.json";
import * as fs from "node:fs";

interface ConfigItem {
	key: string;
	value: string | number | boolean;
	comment: string | string[];
}

const configFile = "config/config.yml";
const configData = readYAML(configFile);
const actualVersion = configData.get("Version") || "1.0.0";

const packageFile = "package.json";
const packageData = JSON.parse(fs.readFileSync(packageFile, "utf8"));
const updateVersion = packageData?.version || "1.0.1";
const update = updateData.find((u) => u.updateVersion === updateVersion);

if (!update) {
	console.log(
		`No se encontró configuración de actualización para la versión ${actualVersion} a ${updateVersion}.`,
	);
	process.exit(0);
}

if (update.updateVersion === actualVersion) {
	console.log(`La versión ${update.actualVersion} ya está actualizada.`);
	process.exit(0);
}

function readYAML(filePath: string) {
	const fileContents = fs.readFileSync(filePath, "utf8");
	return parseDocument(fileContents);
}

function applyChangesToYAML(configItems: ConfigItem[]) {
	const data = readYAML("config/config.yml");
	const json = parse(data.toString());

	for (const item of configItems) {
		const pathParts = item.key.split(".");
		let current = json[pathParts[0]];
		const root = data.get(pathParts[0]) as Document;

		for (let i = 0; i < pathParts.length - 1; i++) {
			const key = pathParts[i];

			if (typeof current === "object" && current !== null) {
				current = json[key];
			}

			if (typeof current !== "object" || current === null) {
				throw new Error(`Invalid path: ${item.key}`);
			}
		}

		const keyToEdit = pathParts[pathParts.length - 1];
		const valueToEdit = item.value;

		const valueNode = data.createNode(valueToEdit);
		valueNode.comment = ` ${item.comment}`;

		root.set(keyToEdit, valueNode);
	}

	return data.toString();
}

async function updateConfig(
	update: (typeof updateData)[number],
): Promise<void> {
	const formattedYaml = applyChangesToYAML(update.config);
	fs.writeFileSync(configFile, formattedYaml, "utf8");

	return console.log(
		`Configuración actualizada desde la versión ${actualVersion} a ${updateVersion}.`,
	);
}

updateConfig(update).catch((err) => console.error(err));
