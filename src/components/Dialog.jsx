import { useEffect, useRef } from "react";

// A panel that opens over the page, using the browser's own <dialog>:
// - showModal() keeps keyboard focus inside it and makes the page behind inert
// - Esc closes it (the browser fires "close", we tell the parent)
// The content is only rendered while it's open, so every time a form opens it
// starts fresh from its defaultValues.
function Dialog({ open, title, onClose, children }) {
  const dialogRef = useRef(null);

  // Syncing React's `open` with the DOM dialog (this is DOM work, not fetching)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) {
      dialog.showModal();
      // Start typing straight away: the field marked data-autofocus, or else
      // the first one. A number you came to change gets selected, ready to overwrite.
      const first =
        dialog.querySelector("[data-autofocus]") ??
        dialog.querySelector("input:not([type=hidden]), select, textarea");
      first?.focus();
      if (first?.hasAttribute("data-autofocus")) first.select?.();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog ref={dialogRef} className="dialog" aria-labelledby="dialog-title" onClose={onClose}>
      {open && (
        <>
          <div className="dialog-header">
            <h2 id="dialog-title">{title}</h2>
            <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
          {children}
        </>
      )}
    </dialog>
  );
}

export default Dialog;
