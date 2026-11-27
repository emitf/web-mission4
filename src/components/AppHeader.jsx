// The app bar: the Clear Count logo on the left, today's date on the right.
//
// The logo is plain HTML + CSS (not an image): a purple bar with "clear" over
// "count". So it's sharp at any size, follows dark mode through the CSS
// variables, and screen readers simply read the heading "clear count".
import { useState } from "react";

function AppHeader() {
  // Today's date, read once when the header first appears (calling new Date()
  // on every render would give a slightly different value each time).
  const [now] = useState(() => new Date());

  // "Thu 26 Nov" (and the full date for screen readers / hover)
  const shortDate = now.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const fullDate = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="app-header">
      <h1 className="logo">
        <span className="logo-bar" aria-hidden="true" />
        <span className="logo-words">
          <span className="logo-clear">clear</span> <span className="logo-count">count</span>
        </span>
      </h1>
      <time className="app-date" dateTime={now.toLocaleDateString("en-CA")} title={fullDate}>
        {shortDate}
      </time>
    </header>
  );
}

export default AppHeader;
