import inquirer from "inquirer";
import { HOME_MENU_OPERATION_NAMES } from "../../consts";

export default class Home {
  constructor() {}

  async display(): Promise<string> {
    const questions = [
      {
        type: "list",
        name: "home",
        message: "Select an option",
        choices: HOME_MENU_OPERATION_NAMES,
      },
    ];

    const answer = await inquirer.prompt(questions);
    if (answer.home === " Exit ") {
      return "Exit";
    }

    return answer.home;
  }
}
