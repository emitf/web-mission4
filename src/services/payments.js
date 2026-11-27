import { getAccount, updateAccount } from "./accounts.js";
import { updateIou } from "./ious.js";
import { today } from "../schemas/common.js";
import { fromCents, toCents } from "../utils/money.js";

// Marking an IOU as paid (or undoing it) changes TWO things with two requests:
// an account's balance and the IOU itself. A real backend would do both in one
// transaction (both or neither). json-server can't, so we do it by hand:
//
// 1. read the account FRESH from the server (not the cached copy, which could
//    be out of date) and change its balance
// 2. update the IOU
// 3. if step 2 fails, put the balance back exactly as it was (a "compensating
//    action"), so nothing is left half done
// 4. if even that fails (e.g. the server went down in between), say clearly
//    which balance was changed, so the user is never left guessing

// The money moves into the account when someone pays me, out when I pay
function signedCents(iou, undo) {
  const cents = toCents(iou.amount);
  const intoAccount = iou.direction === "owedToMe";
  return intoAccount !== undo ? cents : -cents;
}

async function moveMoneyThenSaveIou({ iou, accountId, undo, saveIou }) {
  const account = accountId ? await getAccount(accountId) : null;

  const nothingChanged = `Couldn't ${undo ? "undo the payment" : "mark it as paid"}. Nothing was changed. Try again.`;

  if (account) {
    try {
      await updateAccount(account.id, {
        balance: fromCents(toCents(account.balance) + signedCents(iou, undo)),
      });
    } catch {
      throw new Error(nothingChanged); // step 1 failed: nothing has changed yet
    }
  }

  try {
    return await saveIou();
  } catch (error) {
    if (!account) throw new Error(nothingChanged, { cause: error }); // no balance was touched

    try {
      await updateAccount(account.id, { balance: account.balance }); // undo step 1
    } catch {
      throw new Error(
        `The balance of ${account.name} was changed, but the IOU couldn't be updated. ` +
          `Check ${account.name}'s balance.`,
      );
    }
    throw new Error(nothingChanged, { cause: error });
  }
}

// "Mark as paid": the money goes into (or comes out of) accountId, if given
export function settleIou(iou, accountId) {
  return moveMoneyThenSaveIou({
    iou,
    accountId,
    undo: false,
    saveIou: () =>
      updateIou(iou.id, {
        settled: true,
        settledAt: today(),
        settledAccountId: accountId ?? null,
      }),
  });
}

// "Undo": the money goes back. If that account was deleted since, there's no
// balance to fix (getAccount returns null) and the IOU simply reopens.
export function undoSettleIou(iou) {
  return moveMoneyThenSaveIou({
    iou,
    accountId: iou.settledAccountId,
    undo: true,
    saveIou: () => updateIou(iou.id, { settled: false, settledAt: null, settledAccountId: null }),
  });
}
