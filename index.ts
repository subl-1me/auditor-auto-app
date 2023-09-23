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
      break;
    }
    const result = await menuUtils.processUserChoice(userChoice);
  } while (true);

  console.log("App is closing with 0 errors...");
  return;
}

main();
