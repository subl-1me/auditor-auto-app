import MenuStack from "../MenuStack";
import TokenStorage from "../utils/TokenStorage";

// operations
import Logger from "./logger/Logger";
import Noktos from "./noktosProcess/Noktos";
import Invoicer from "./invoicer/Invoicer";
import Printer from "./printer/Printer";

export default class OperationManager {
  constructor() {}

  async handleOperation(
    operation: string,
    menuStack: MenuStack
  ): Promise<void> {
    let operationResponse;
    switch (operation) {
      case "Login":
        const logger = new Logger();
        const loggerResponse = await logger.performLogin(menuStack);
        operationResponse = loggerResponse;
        if (loggerResponse.status !== 200) {
          return operationResponse;
        }
        // if sucess save in local
        await TokenStorage.write(JSON.stringify(loggerResponse.tokens));
        break;
      case "Start Noktos process":
        const noktos = new Noktos();
        await noktos.performProcess(menuStack);
        break;
      case "Invoicer":
        const invoicer = new Invoicer();
        operationResponse = await invoicer.performInvoicer(menuStack);
        //TODO: handle saving data, errors and pendings reservations to be invoiced
        return operationResponse;
      case "Print docs":
        const printer = new Printer();
        operationResponse = await printer.performPrinter(menuStack);
        break;
      default:
        operationResponse = {
          status: 404,
          error: "Invalid operation select.",
        };
        break;
    }

    return operationResponse;
  }
}
