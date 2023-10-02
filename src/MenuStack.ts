export default class MenuStack {
  private stack: any[];
  constructor() {
    this.stack = [];
  }

  push(menu: any): void {
    this.stack.push(menu);
  }

  pop(): any {
    return this.stack.pop();
  }

  peek(): any {
    return this.stack[this.stack.length - 1];
  }

  isEmpty(): boolean {
    return this.stack.length === 0;
  }
}
