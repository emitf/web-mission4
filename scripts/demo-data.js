// Runs before "npm run dev:demo": starts the demo with FRESH example data
// every time (db.demo.json is a throwaway copy of db.example.json).
import { copyFileSync } from "node:fs";

copyFileSync("db.example.json", "db.demo.json");
console.log("db.demo.json reset from db.example.json");
