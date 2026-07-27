import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: ReactNode;
  label: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, helperText, id: providedId, label, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptionId = `${id}-description`;

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        aria-describedby={error || helperText ? descriptionId : undefined}
        aria-invalid={Boolean(error)}
        id={id}
        ref={ref}
        {...props}
      />
      {error ? (
        <small className="field-error" id={descriptionId}>
          {error}
        </small>
      ) : helperText ? (
        <small className="helper-text" id={descriptionId}>
          {helperText}
        </small>
      ) : null}
    </label>
  );
});
