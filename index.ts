import path from "path";
import MenuStack from "./src/MenuStack";
import Home from "./src/operations/home/HomeMenu";
import MenuUtils from "./src/utils/menuUtils";
import * as reservationUtils from "./src/utils/reservationUtlis";
import FrontService from "./src/services/FrontService";
import TokenStorage from "./src/utils/TokenStorage";
import DocAnalyzer from "./src/DocAnalyzer";
import fs from "fs/promises";
import { IN_HOUSE_FILTER } from "./src/consts";
import dotenv from "dotenv";
dotenv.config();

const { STORAGE_TEMP_PATH } = process.env;

async function main(): Promise<void> {
  const menuStack = new MenuStack();
  const menuUtils = new MenuUtils(menuStack);
  menuStack.push(new Home());

  // const filePath = path.join(
  //   __dirname,
  //   "temp",
  //   "docsToAnalyze",
  //   "doc-1170243-21572805.pdf"
  // );

  // await DocAnalyzer.read(filePath);
  // const frontService = new FrontService();
  // const authTokens = await TokenStorage.getData();
  // const docsPath = path.join(__dirname, "temp", "docsToAnalyze");

  // const reservations = await reservationUtils.getReservationList("in-house");
  // for (const reservation of reservations) {
  //   const attachedDocs = await reservationUtils.getReservationGuaranteeDocs(
  //     reservation.id
  //   );

  //   if (attachedDocs.length > 0) {
  //     for (const doc of attachedDocs) {
  //       console.log(`Downloading for: ${reservation.guestName}`);
  //       console.log(doc);
  //       const downloaderRes = await frontService.downloadByUrl(
  //         `doc-${doc.id}-${reservation.id}.pdf`,
  //         docsPath,
  //         authTokens,
  //         doc.downloadUrl
  //       );

  //       console.log(downloaderRes);
  //     }
  //   }

  //   console.log("This reservation has no attached documents.");
  // }

  // const docsPath = path.join(__dirname, "temp", "docsToAnalyze");
  // const docToAnalyze = await fs.readdir(docsPath);
  // for (const docPath of docToAnalyze) {
  //   // console.log(docPath);
  //   let docP = path.join(docsPath, docPath);
  //   const analyzerResult = await DocAnalyzer.read(docP);
  //   // await DocAnalyzer.read(analyzerResult);
  // }
  // console.log(docToAnalyze);

  // const reservations = await reservationUtils.getReservationList(
  //   IN_HOUSE_FILTER
  // );
  // for (const reservation of reservations) {
  //   const reservationDocuments =
  //     await reservationUtils.getReservationGuaranteeDocs(reservation.id);
  //   if (reservationDocuments.length === 0) {
  //     continue;
  //   }

  //   console.log(
  //     `Reading guarantee document from ${reservation.room} - ${reservation.guestName}`
  //   );
  //   const document = reservationDocuments[0];

  //   // download document
  //   // const authTokens = await TokenStorage.getData();
  //   const fileDownloader = await frontService.downloadByUrl(
  //     `docsToAnalyze/doc-${reservation.id}.pdf`,
  //     STORAGE_TEMP_PATH || "",
  //     authTokens,
  //     document.downloadUrl
  //   );

  //   if (fileDownloader.status !== 200) {
  //     throw new Error("Error downloading guarantee document.");
  //   }

  //   const docCheckerResults = await DocAnalyzer.read(fileDownloader.filePath);
  //   console.log(docCheckerResults);
  // }
  // return;

  do {
    const currentMenu = menuStack.peek();
    if (!currentMenu) {
      throw new Error("Menu error: undefined current menu");
    }
    //TODO: Implement userChoice
    const userChoice = await currentMenu.display();
    if (userChoice === "Exit") {
      menuStack.pop();
      console.log("exiting...");
      break;
    }

    console.log(userChoice);
    if (userChoice === " Return ") {
      menuStack.pop();
    } else {
      await menuUtils.processUserChoice(userChoice);
    }

    // if (userChoice === "Return") {
    //   menuStack.pop();
    //   console.log("returning...");
    // } else {
    //   // case user chose another option or return action
    //   const userProccecedChoice = await menuUtils.processUserChoice(userChoice);
    //   console.log(userProccecedChoice);
    //   if (userProccecedChoice === "Return" && !menuStack.isEmpty()) {
    //     menuStack.pop();
    //   }
    // }
  } while (true);

  return;
}

main();
