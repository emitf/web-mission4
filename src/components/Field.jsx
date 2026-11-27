import FieldError from "./FieldError.jsx";

// Accessible form fields, so every form doesn't repeat the same markup.
// Each one does the four things from slide 23:
// - a real <label htmlFor> joined to the input's id
// - aria-invalid when the field has an error
// - aria-describedby pointing to its hint and/or its error message
// - the error itself with role="alert" (in FieldError)
//
// They are used with React Hook Form like a normal input:
//   <TextField id="account-name" label="Name" error={errors.name} {...register("name")} />
// register() gives name, onChange, onBlur and ref; in React 19 `ref` arrives as
// a normal prop, so we pass it on to the real <input> (still uncontrolled).

// "account-name-hint account-name-error", or nothing if there's neither
function describedBy(id, hint, error) {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function TextField({ id, label, optional = false, hint, error, ref, ...inputProps }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {optional && <span className="optional"> (optional)</span>}
      </label>
      <input
        id={id}
        ref={ref}
        type="text"
        autoComplete="off"
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy(id, hint, error)}
        {...inputProps}
      />
      {hint && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

// options: [{ value, label }]; placeholder = an empty first option ("Choose…")
export function SelectField({ id, label, hint, error, options, placeholder, ref, ...selectProps }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        ref={ref}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy(id, hint, error)}
        {...selectProps}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

// A group of radio buttons, shown as pills or as a segmented switch.
// The <legend> is read once for the whole group (slide 22).
// options: [{ value, label, ariaLabel? }] (ariaLabel when the label is just "€")
// registration: the result of register("field"), shared by all the radios
export function ChoiceField({
  id,
  legend,
  hideLegend = false,
  options,
  error,
  registration,
  variant = "pills",
}) {
  const segmented = variant === "segmented";
  return (
    <fieldset className="field" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className={hideLegend ? "visually-hidden" : undefined}>{legend}</legend>
      <div className={segmented ? "segmented segmented-wide" : "choice-group"}>
        {options.map((option) => (
          <label key={option.value} className={segmented ? "segmented-option" : "choice"}>
            <input
              type="radio"
              value={option.value}
              aria-label={option.ariaLabel}
              aria-invalid={error ? "true" : "false"}
              {...registration}
            />
            <span aria-hidden={option.ariaLabel ? "true" : undefined}>{option.label}</span>
          </label>
        ))}
      </div>
      <FieldError id={`${id}-error`} error={error} />
    </fieldset>
  );
}
