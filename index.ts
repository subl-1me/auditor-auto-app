import MenuStack from "./src/MenuStack";
import Home from "./src/operations/home/HomeMenu";
import MenuUtils from "./src/utils/menuUtils";
import dotenv from "dotenv";
import {
  getReservationInvoiceList,
  getReservationList,
  getReservationLogs,
} from "./src/utils/reservationUtlis";
import { DEPARTURES_FILTER, IN_HOUSE_FILTER } from "./src/consts";

dotenv.config();

async function main(): Promise<void> {
  const menuStack = new MenuStack();
  const menuUtils = new MenuUtils(menuStack);

  // TODO: Implement a menu CONST KEYS EX: MENU_ACTION_RETURN, MENU_ACTION_
  menuStack.push(new Home());

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

    if (userChoice === " Return ") {
      menuStack.pop();
    } else {
      let choice = await menuUtils.processUserChoice(userChoice);
      if (choice.status !== 200) {
        menuStack.pop();
      }
    }
  } while (true);

  return;
}

main();
