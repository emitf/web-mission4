import { useQuery } from "@tanstack/react-query";
import { getIous } from "../services/ious.js";
import { queryKeys } from "../queryKeys.js";
import { useExchangeRate } from "../hooks/useExchangeRate.js";
import { formatMoney, otherCurrency, toCents, toDisplayCents } from "../utils/money.js";
import { today } from "../schemas/common.js";
import { LoadingRows, QueryError } from "./QueryStatus.jsx";

// Two tiles: money people owe me and money I owe, in the display currency.
function SummaryTiles({ displayCurrency }) {
  const iousQuery = useQuery({
    queryKey: queryKeys.ious,
    queryFn: getIous,
  });

  // Only the IOUs that are still open count
  const open = iousQuery.data?.filter((iou) => !iou.settled) ?? [];
  const foreign = otherCurrency(displayCurrency);

  // Same key as the total balance uses → shared, not requested twice
  const rateQuery = useExchangeRate({
    from: foreign,
    to: displayCurrency,
    needed: open.some((iou) => iou.currency === foreign),
  });

  if (iousQuery.isPending) {
    return <LoadingRows label="Loading what you owe and are owed…" rows={1} />;
  }
  if (iousQuery.isError) {
    return <QueryError error={iousQuery.error} onRetry={() => iousQuery.refetch()} what="your IOUs" />;
  }

  const owedToMe = open.filter((iou) => iou.direction === "owedToMe");
  const iOwe = open.filter((iou) => iou.direction === "iOwe");

  return (
    <div className="tiles">
      <Tile
        title="Owed to me"
        ious={owedToMe}
        tone="positive"
        displayCurrency={displayCurrency}
        rateQuery={rateQuery}
      />
      <Tile
        title="I owe"
        ious={iOwe}
        tone="negative"
        displayCurrency={displayCurrency}
        rateQuery={rateQuery}
      />
    </div>
  );
}

function Tile({ title, ious, tone, displayCurrency, rateQuery }) {
  const rate = rateQuery.data?.rate;
  const converted = ious.map((iou) =>
    toDisplayCents(toCents(iou.amount), iou.currency, displayCurrency, rate),
  );
  // null = an IOU in the other currency and no rate (still loading or failed)
  const missingRate = converted.includes(null);
  const total = converted.reduce((sum, cents) => sum + (cents ?? 0), 0);
  const overdue = ious.filter((iou) => iou.dueDate < today()).length;

  return (
    <div className="tile">
      <h3 className="tile-title">{title}</h3>
      <p className={`tile-amount amount ${ious.length > 0 ? tone : ""}`}>
        {missingRate
          ? rateQuery.isError
            ? "Can't convert right now"
            : "…"
          : formatMoney(total, displayCurrency)}
      </p>
      <p className="tile-note">
        {ious.length === 0
          ? "Nothing pending"
          : `${ious.length} ${ious.length === 1 ? "person" : "people"}`}
        {overdue > 0 && <span className="overdue"> · {overdue} overdue</span>}
      </p>
    </div>
  );
}

export default SummaryTiles;
