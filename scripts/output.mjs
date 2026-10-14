import { format } from "node:util";

export function print(...values) {
  process.stdout.write(format(...values) + "\n");
}

export function printError(...values) {
  process.stderr.write(format(...values) + "\n");
}
