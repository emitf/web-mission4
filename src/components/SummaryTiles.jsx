import { useMoneySummary } from "../hooks/useMoneySummary.js";
import { formatMoney } from "../utils/money.js";
import { today } from "../schemas/common.js";
import { LoadingRows, QueryError } from "./QueryStatus.jsx";

// Two tiles: money people owe me and money I owe, in the display currency.
// Same hook as the total → the IOUs and the rate come from the shared cache.
function SummaryTiles({ displayCurrency }) {
  const { iousQuery, rateQuery, openIous, owedToMe, iOwe } = useMoneySummary(displayCurrency);

  if (iousQuery.isPending) {
    return <LoadingRows label="Loading what you owe and are owed…" rows={1} />;
  }
  if (iousQuery.isError) {
    return (
      <QueryError error={iousQuery.error} onRetry={() => iousQuery.refetch()} what="your IOUs" />
    );
  }

  return (
    <div className="tiles">
      <Tile
        title="Owed to me"
        ious={openIous.filter((iou) => iou.direction === "owedToMe")}
        cents={owedToMe}
        tone="positive"
        displayCurrency={displayCurrency}
        rateFailed={rateQuery.isError}
      />
      <Tile
        title="I owe"
        ious={openIous.filter((iou) => iou.direction === "iOwe")}
        cents={iOwe}
        tone="negative"
        displayCurrency={displayCurrency}
        rateFailed={rateQuery.isError}
      />
    </div>
  );
}

function Tile({ title, ious, cents, tone, displayCurrency, rateFailed }) {
  const overdue = ious.filter((iou) => iou.dueDate < today()).length;

  return (
    <div className="tile">
      <h3 className="tile-title">{title}</h3>
      <p className={`tile-amount amount ${ious.length > 0 ? tone : ""}`}>
        {/* null = an IOU in the other currency and no rate (still loading or failed) */}
        {cents === null
          ? rateFailed
            ? "Can't convert right now"
            : "…"
          : formatMoney(cents, displayCurrency)}
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
