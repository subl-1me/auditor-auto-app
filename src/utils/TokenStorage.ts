import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const { STORAGE_TOKEN_PATH } = process.env;

export default class TokenStorage {
  constructor() {}

  static async write(data: any): Promise<void> {
    if (!STORAGE_TOKEN_PATH) {
      throw new Error("Invalid storage token path.");
    }

    const fileName = "auth.json";
    const filePath = path.join(STORAGE_TOKEN_PATH, fileName);
    await fs.writeFile(filePath, data, { encoding: "utf8" }).catch((err) => {
      throw new Error(err.message);
    });
  }

  static async getData(): Promise<any> {
    if (!STORAGE_TOKEN_PATH) {
      throw new Error("Invalid storage token path.");
    }

    const fileName = "auth.json";
    const filePath = path.join(STORAGE_TOKEN_PATH, fileName);
    const data = await fs.readFile(filePath, { encoding: "utf8" });
    const authToken = JSON.parse(data);
    return authToken;
  }
}
