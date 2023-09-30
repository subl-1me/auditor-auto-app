import OperationManager from "../operations/OperationManager";
import MenuStack from "../MenuStack";
import MessageDisplayer from "./messageDisplayer";

export default class MenuUtils {
  constructor(private menuStack: MenuStack) {}

  async processUserChoice(choice: any): Promise<void> {
    const messageDisplayer = new MessageDisplayer();
    //TODO: implement if choice is a submenu
    const menuOperationsNames = [
      "Login",
      "Invoicer",
      "Print docs",
      "Start Noktos process",
    ];

    const prop = Object.getOwnPropertyNames(choice).shift();
    if (!prop) {
      throw new Error("Menu error: menu selection cannot be undefined");
    }
    const selection = choice[prop];
    if (menuOperationsNames.includes(selection)) {
      const operationManager = new OperationManager();
      // perform operations
      const opResposne = await operationManager.handleOperation(
        selection,
        this.menuStack
      );
      messageDisplayer.display(opResposne);
    }
    //TODO: implement submenus
  }
}
