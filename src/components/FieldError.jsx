// The message under a field. The input points to it with aria-describedby,
// and role="alert" makes the screen reader say it as soon as it appears.
function FieldError({ id, error }) {
  if (!error) return null;
  return (
    <p id={id} className="field-error" role="alert">
      {error.message}
    </p>
  );
}

export default FieldError;
