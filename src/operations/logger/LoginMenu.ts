import User from "./types/User";
import inquirer from "inquirer";

export default class Login {
  async display(): Promise<User> {
    // const questions = [
    //   {
    //     type: "input",
    //     name: "username",
    //     message: "Type your username",
    //   },
    //   {
    //     type: "password",
    //     name: "password",
    //     message: "Tyte your password",
    //   },
    // ];
    // const answers = await inquirer.prompt(questions);
    return {
      username: "HTJUGALDEA",
      password: "qWERTY666-",
    };
  }
}
