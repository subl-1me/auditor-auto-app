import fsAsync from "fs/promises";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import ReservationChecked from "../types/ReservationChecked";
import Reservation from "../types/Reservation";
import { PRE_PAID } from "../consts";
import PitCheckerResult from "../types/PitCheckerResult";

const STORAGE_TEMP_PATH = process.env.STORAGE_TEMP_PATH || "";
const INVOICES_QUEUE_FILENAME = path.join(
  STORAGE_TEMP_PATH,
  "invoicesQueue.json"
);
const PENDING_RESERVATIONS_PATH = path.join(
  STORAGE_TEMP_PATH,
  "pendingReservationsQueue.json"
);
const CHECKED_LIST_PATH = path.join(STORAGE_TEMP_PATH, "checkedList.json");
const GENERIC_LIST_PATH = path.join(STORAGE_TEMP_PATH, "genericList.json");

export class TempStorage {
  constructor() {}

  async deleteTempDoc(filePath: string): Promise<any> {
    try {
      const deleteRes = await fsAsync.unlink(filePath);
      console.log(deleteRes);
    } catch (err: any) {
      console.log("is here");
      console.log(err);
      return {
        status: 400,
        message: err.message,
      };
    }

    return {
      status: 200,
      message: "File deleted.",
    };
  }

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
      console.log("invoices queue");
      console.log(err);
      return {
        status: 400,
        message: err,
      };
    }
  }

  async writeCheckedOn(category: string, datta: any): Promise<any> {
    if (!fs.existsSync(CHECKED_LIST_PATH)) {
      await this.createDefaultCheckedList();
    }

    try {
      const data = await this.readChecked();
      if (category === PRE_PAID) {
        data.PRE_PAID[datta.prePaidMethod.type].push(datta);
      } else {
        data[category].push(datta);
      }
      await fsAsync.writeFile(CHECKED_LIST_PATH, JSON.stringify(data), "utf8");
      return {
        status: 200,
        message: "Data uploaded.",
      };
    } catch (err) {
      console.log("wirte on");
      console.log(err);
      return [];
    }
  }

  async updateChecker(checkResult: PitCheckerResult): Promise<any> {
    const checkedListData = await this.readChecked();
  }

  async writeChecked(reservation: any): Promise<any> {
    if (!fs.existsSync(CHECKED_LIST_PATH)) {
      await this.createDefaultCheckedList();
    }

    try {
      const data = await this.readChecked();
      // if (checkedList.find((result: any) => result.id === reservation.id)) {
      //   return {
      //     status: 400,
      //     message: "DUPLICATE",
      //   };
      // }

      data.checkedList.push(reservation);
      await fsAsync.writeFile(CHECKED_LIST_PATH, JSON.stringify(data), "utf8");

      return {
        status: 200,
        message: "File updated.",
      };
    } catch (err) {
      console.log("write checked");
      console.log(err);
      return [];
    }
  }

  async readChecked(): Promise<any> {
    if (!fs.existsSync(CHECKED_LIST_PATH)) {
      await this.createDefaultCheckedList();
    }

    try {
      const jsonDataText = await fsAsync.readFile(CHECKED_LIST_PATH, "utf-8");
      const jsonDataParsed = JSON.parse(jsonDataText);
      return jsonDataParsed;
    } catch (err) {
      console.log(err);
      return [];
    }
  }

  public async createDefaultCheckedList(): Promise<any> {
    try {
      let defaultData = {
        PENDING: [],
        PRE_PAID: {
          VIRTUAL_CARD: [],
          COUPON: [],
          CERTIFICATE: [],
          UNKOWN: [],
        },
        FULLY_PAID: [],
        PARTIAL_PAID: [],
        ROUTER: [],
        ROUTED: [],
        ERROR: [],
        HISTORY: [],
        checkedList: [],
      };

      await fsAsync.writeFile(
        CHECKED_LIST_PATH,
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
