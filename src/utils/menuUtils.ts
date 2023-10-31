import OperationManager from "../operations/OperationManager";
import MenuStack from "../MenuStack";
import MessageDisplayer from "./messageDisplayer";

import { menuOperationsNames } from "../consts";

export default class MenuUtils {
  constructor(private menuStack: MenuStack) {}

  async processUserChoice(choice: any): Promise<any> {
    const messageDisplayer = new MessageDisplayer();
    //TODO: implement if choice is a submenu

    const prop = Object.getOwnPropertyNames(choice).shift();
    if (!prop) {
      throw new Error("Menu error: invalid input.");
    }

    const selection = choice[prop];
    let operationResponse;
    if (menuOperationsNames.includes(selection)) {
      const operationManager = new OperationManager();
      // perform operations
      const opResponse = await operationManager.handleOperation(
        selection,
        this.menuStack
      );
      messageDisplayer.display(opResponse);
      operationResponse = opResponse;
    }

    return operationResponse;
    //TODO: implement submenus
  }
}
