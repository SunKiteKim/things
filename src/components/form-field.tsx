export function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-row">
      <label htmlFor={htmlFor}>{label}</label>
      <div>{children}</div>
    </div>
  );
}
