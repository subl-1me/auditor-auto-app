import MenuStack from "./src/MenuStack";
import Home from "./src/operations/home/HomeMenu";
import MenuUtils from "./src/utils/menuUtils";

async function main(): Promise<void> {
  const menuStack = new MenuStack();
  const menuUtils = new MenuUtils(menuStack);
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
