import fsAsync from "fs/promises";
import fs from "fs";
import path, { parse } from "path";
import dotenv from "dotenv";
dotenv.config();

const STORAGE_TEMP_PATH = process.env.STORAGE_TEMP_PATH || "";
const INVOICES_QUEUE_FILENAME = path.join(
  STORAGE_TEMP_PATH,
  "invoicesQueue.json"
);
const PENDING_RESERVATIONS_PATH = path.join(
  STORAGE_TEMP_PATH,
  "pendingReservationsQueue.json"
);
const GENERIC_LIST_PATH = path.join(STORAGE_TEMP_PATH, "genericList.json");

export class TempStorage {
  constructor() {}

  private async createDefaultGenericList(): Promise<any> {
    try {
      let defaultData = {
        genericList: [],
      };

      await fsAsync.writeFile(
        GENERIC_LIST_PATH,
        JSON.stringify(defaultData),
        "utf8"
      );

      return {
        status: 200,
        message: "Default temp file created.",
      };
    } catch (err) {
      return {
        status: 400,
      };
    }
  }

  async writeGenericList(data: any): Promise<any> {
    try {
      if (!fs.existsSync(GENERIC_LIST_PATH)) {
        await this.createDefaultGenericList();
      }

      await fsAsync.writeFile(GENERIC_LIST_PATH, JSON.stringify(data), "utf8");
      return {
        status: 200,
        message: "File saved.",
      };
    } catch (err) {
      return {
        status: 400,
        err,
      };
    }
  }

  async readGenericList(): Promise<Number[]> {
    try {
      const jsonDataText = await fsAsync.readFile(GENERIC_LIST_PATH, "utf8");
      const genericList = JSON.parse(jsonDataText);

      return genericList.genericList.map((room: string) => {
        return Number(room);
      });
    } catch (err) {
      console.log("Error trying to get generic list");
      console.log(err);
      return [];
    }
  }

  private async createDefaultInvoicesQueue(): Promise<any> {
    try {
      let defaultData = {
        invoicesQueue: [],
      };
      await fsAsync.writeFile(
        INVOICES_QUEUE_FILENAME,
        JSON.stringify(defaultData),
        {
          encoding: "utf-8",
        }
      );

      return {
        status: 200,
      };
    } catch (err) {
      return {
        status: 400,
      };
    }
  }

  private async createDefaultPendingQueue(): Promise<any> {
    try {
      let defaultData = {
        pendingReservationsQueue: [],
      };

      await fsAsync.writeFile(
        PENDING_RESERVATIONS_PATH,
        JSON.stringify(defaultData),
        "utf8"
      );

      return {
        status: 200,
      };
    } catch (err) {
      return {
        status: 400,
        err,
      };
    }
  }

  async writeInvoicesQueue(data: any): Promise<any> {
    if (!fs.existsSync(INVOICES_QUEUE_FILENAME)) {
      await this.createDefaultInvoicesQueue();
    }

    try {
      const invoicesQueue = await this.readInvoicesQueue();
      if (invoicesQueue.err) {
        console.log(invoicesQueue.err);
        return [];
      }
      invoicesQueue.invoicesQueue.push(data);

      await fsAsync.writeFile(
        INVOICES_QUEUE_FILENAME,
        JSON.stringify(invoicesQueue),
        "utf8"
      );

      return {
        status: 200,
        message: "File saved.",
      };
    } catch (err) {
      console.log(err);
      return {
        status: 400,
        message: err,
      };
    }
  }

  async readInvoicesQueue(): Promise<any> {
    try {
      const jsonDataText = await fsAsync.readFile(
        INVOICES_QUEUE_FILENAME,
        "utf-8"
      );
      const jsonDataParsed = JSON.parse(jsonDataText);
      return jsonDataParsed;
    } catch (err) {
      return {
        status: 400,
        err,
      };
    }
  }

  async writePendingReservations(data: string): Promise<any> {
    if (!fs.existsSync(PENDING_RESERVATIONS_PATH)) {
      await this.createDefaultPendingQueue();
    }

    try {
      const pendingReservations = await this.readPendingReservations();
      if (pendingReservations.err) {
        console.log(pendingReservations.err);
        return [];
      }

      pendingReservations.pendingReservationsQueue.push(data);
      await fsAsync.writeFile(
        PENDING_RESERVATIONS_PATH,
        JSON.stringify(pendingReservations),
        "utf8"
      );

      return {
        status: 200,
        message: "File updated.",
      };
    } catch (err) {
      return {
        status: 400,
        err,
      };
    }
  }

  async readPendingReservations(): Promise<any> {
    try {
      const jsonDataText = await fsAsync.readFile(
        PENDING_RESERVATIONS_PATH,
        "utf8"
      );
      const jsonData = JSON.parse(jsonDataText);

      return jsonData;
    } catch (err) {}
  }
}