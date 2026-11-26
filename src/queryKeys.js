// Every label of the TanStack Query cache, in one place.
// Reading (useQuery) and refreshing (invalidateQueries) must use exactly the
// same keys, so nobody types them by hand anywhere else.
//
// A key includes everything that changes the result: the EUR→USD rate is a
// different piece of data from the USD→EUR rate, so both currencies are in its key.
export const queryKeys = {
  accounts: ["accounts"],
  ious: ["ious"],
  rate: (from, to) => ["rates", from, to],
};
