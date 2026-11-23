// Creates db.json from db.example.json the first time the app runs.
// db.json holds my real money data, so it is in .gitignore and never committed.
import { existsSync, copyFileSync } from "node:fs";

if (!existsSync("db.json")) {
  copyFileSync("db.example.json", "db.json");
  console.log("db.json created from db.example.json");
}
