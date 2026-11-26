import { useEffect, useRef, useState } from "react";

// A delete button that asks first, inside the page:
//   [×]  →  "Delete this?  [Cancel] [Yes, delete]"
// (The browser's own window.confirm() popup can be blocked, and then nothing
// happens at all, so the question is part of the app instead.)
//
// - Focus moves to "Cancel": pressing Enter by accident never deletes anything.
// - Esc or Cancel goes back to the button, with the focus on it again.
function ConfirmDelete({ question, onConfirm, isPending, label, triggerClassName, children }) {
  const [asking, setAsking] = useState(false);
  const cancelRef = useRef(null);
  const triggerRef = useRef(null);
  const wasAsking = useRef(false);

  // Moving the keyboard focus is DOM work, so it happens after rendering
  useEffect(() => {
    if (asking) cancelRef.current?.focus();
    else if (wasAsking.current) triggerRef.current?.focus();
    wasAsking.current = asking;
  }, [asking]);

  if (!asking) {
    return (
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={label}
        onClick={() => setAsking(true)}
      >
        {children}
      </button>
    );
  }

  return (
    <span
      className="confirm"
      role="group"
      aria-label={question}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          // Close only this question, not the panel it may be inside
          event.preventDefault();
          event.stopPropagation();
          setAsking(false);
        }
      }}
    >
      <span className="confirm-question">{question}</span>
      <button
        ref={cancelRef}
        type="button"
        className="button-small"
        onClick={() => setAsking(false)}
        disabled={isPending}
      >
        Cancel
      </button>
      <button
        type="button"
        className="button-small button-small-danger"
        onClick={onConfirm}
        disabled={isPending}
      >
        {isPending ? "Deleting…" : "Yes, delete"}
      </button>
    </span>
  );
}

export default ConfirmDelete;
