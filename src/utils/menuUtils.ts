import OperationManager from "../operations/OperationManager";
import MenuStack from "../MenuStack";
import MessageDisplayer from "./messageDisplayer";

import UtilsMenu from "../operations/utils/UtilsMenu";

import {
  HOME_MENU_OPERATION_NAMES,
  UTILS_MENU_OPERATION_NAMES,
} from "../consts";

export default class MenuUtils {
  constructor(private menuStack: MenuStack) {}

  async processUserChoice(choice: any): Promise<any> {
    const messageDisplayer = new MessageDisplayer();
    //TODO: implement if choice is a submenu

    // const prop = Object.getOwnPropertyNames(choice).shift();
    // if (!prop) {
    //   throw new Error("Menu error: invalid input.");
    // }

    // const selection = choice[prop];
    let operationResponse;
    if (choice === "Utils") {
      this.menuStack.push(new UtilsMenu());
      return;
    }
    const operationManager = new OperationManager();
    // perform operations
    const opResponse = await operationManager.handleOperation(
      choice,
      this.menuStack
    );
    messageDisplayer.display(opResponse);
    operationResponse = opResponse;
    // if (HOME_MENU_OPERATION_NAMES.includes(selection)) {
    //   // it means it belongs to a sub-menu

    // }

    return operationResponse;
    //TODO: implement submenus
  }
}
