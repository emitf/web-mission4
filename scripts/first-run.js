// Runs before "npm run dev" (and "npm run api" / "npm run build").
// Creates the two local files that are NOT in the repo, the first time only:
//
// - .env    from .env.example  → the API addresses (kept out of git, slide 50)
// - db.json from db.example.json → my real money data (never committed)
//
// So a fresh clone works with just "npm install" + "npm run dev".
import { existsSync, copyFileSync } from "node:fs";

const files = [
  { local: ".env", example: ".env.example" },
  { local: "db.json", example: "db.example.json" },
];

for (const { local, example } of files) {
  if (!existsSync(local)) {
    copyFileSync(example, local);
    console.log(`${local} created from ${example}`);
  }
}
