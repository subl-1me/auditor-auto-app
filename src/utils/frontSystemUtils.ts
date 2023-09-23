import fs from "fs/promises";
import path from "path";

const { STORAGE_CONFIG_PATH } = process.env;
const fileName = "config.json";

export async function write(data: any): Promise<void> {
  if (!STORAGE_CONFIG_PATH) {
    throw new Error("INVALID STORAGE CONFIG PATH");
  }

  const dataString = JSON.stringify(data);
  await fs
    .writeFile(path.join(STORAGE_CONFIG_PATH, fileName), dataString, {
      encoding: "utf-8",
    })
    .catch((err) => {
      throw new Error(err.message);
    });
}

export async function getConfig(): Promise<any> {
  if (!STORAGE_CONFIG_PATH) {
    throw new Error("INVALID STORAGE CONFIG PATH");
  }

  const data = await fs.readFile(path.join(STORAGE_CONFIG_PATH, fileName), {
    encoding: "utf-8",
  });

  return JSON.parse(data);
}
