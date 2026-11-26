// "Fix this record": a broken record from the server can't go straight into a
// form, so we keep only the fields that are still valid and leave the rest
// empty for the user to fill in. Each field is checked with the SAME Zod
// pieces the schemas use (single source of truth), just one at a time.
import { ACCOUNT_TYPES } from "../schemas/account.js";
import { IOU_DIRECTIONS } from "../schemas/iou.js";
import { amountSchema, balanceSchema, currencySchema, isoDateSchema } from "../schemas/common.js";

// The value if it passes the schema, otherwise "" (an empty field)
function keep(schema, value) {
  return schema.safeParse(value).success ? value : "";
}

const text = (value) => (typeof value === "string" ? value : "");

export function salvageAccount(record) {
  return {
    id: record.id,
    name: text(record.name),
    type: ACCOUNT_TYPES.includes(record.type) ? record.type : "",
    currency: keep(currencySchema, record.currency),
    // Only a real number is kept: "12,50" as text is exactly the kind of thing to fix
    balance: typeof record.balance === "number" ? keep(balanceSchema, record.balance) : "",
  };
}

export function salvageIou(record) {
  return {
    id: record.id,
    person: text(record.person),
    direction: IOU_DIRECTIONS.includes(record.direction) ? record.direction : "",
    amount: typeof record.amount === "number" ? keep(amountSchema, record.amount) : "",
    currency: keep(currencySchema, record.currency),
    dateLent: keep(isoDateSchema, record.dateLent),
    dueDate: keep(isoDateSchema, record.dueDate),
    note: text(record.note),
    // A broken IOU may be missing this; saving the fix makes it a normal open IOU
    settled: record.settled === true,
  };
}
