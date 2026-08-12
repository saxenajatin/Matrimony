import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FieldProps = {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  required?: boolean;
  type?: string;
  placeholder?: string;
  className?: string;
};

export function TextField({
  name,
  label,
  defaultValue,
  required,
  type = "text",
  placeholder,
  className,
}: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
      />
    </div>
  );
}

export function TextAreaField({
  name,
  label,
  defaultValue,
  placeholder,
  className,
}: Omit<FieldProps, "type" | "required">) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={4}
      />
    </div>
  );
}

type SelectFieldProps = FieldProps & {
  options: readonly { value: string; label: string }[];
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function SelectField({
  name,
  label,
  defaultValue,
  required,
  options,
  allowEmpty = true,
  emptyLabel = "Any / Skip",
  className,
}: SelectFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
