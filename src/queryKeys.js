// Every label of the TanStack Query cache, in one place.
// Reading (useQuery) and refreshing (invalidateQueries) must use exactly the
// same keys, so nobody types them by hand anywhere else.
//
// A key includes everything that changes the result:
// one account's movements are a different list from all movements.
// Invalidating ["movements"] also refreshes every ["movements", {...}] below it.
export const queryKeys = {
  accounts: ["accounts"],
  movements: ["movements"],
  accountMovements: (accountId) => ["movements", { accountId }],
  ious: ["ious"],
  rate: (from, to) => ["rates", from, to],
};
