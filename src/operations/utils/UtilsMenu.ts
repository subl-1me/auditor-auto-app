import inquirer from "inquirer";
import { UTILS_MENU_OPERATION_NAMES } from "../../consts";

export default class UtilsMenu {
  async display(): Promise<string> {
    const questions = [
      {
        type: "list",
        name: "utils",
        message: "Select an option",
        choices: UTILS_MENU_OPERATION_NAMES,
      },
    ];
    const answer = await inquirer.prompt(questions);
    return answer.utils;
  }
}
