"use client";

import { useState } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TextFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  autoComplete?: string;
  description?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  format?: (value: string) => string;
};

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
  description,
  className,
  inputClassName,
  disabled,
  format,
}: TextFieldProps<T>) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && showPassword ? "text" : type;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={Boolean(fieldState.error)} className={className}>
          <FieldLabel htmlFor={String(name)}>{label}</FieldLabel>
          <div className="relative">
            <Input
              id={String(name)}
              type={resolvedType}
              placeholder={placeholder}
              autoComplete={autoComplete}
              disabled={disabled}
              aria-invalid={Boolean(fieldState.error)}
              className={cn(isPassword && "pr-10", inputClassName)}
              {...field}
              value={(field.value as string | number | undefined) ?? ""}
              onChange={(event) =>
                field.onChange(
                  format ? format(event.target.value) : event.target.value,
                )
              }
            />
            {isPassword ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            ) : null}
          </div>
          {description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
          <FieldError>{fieldState.error?.message}</FieldError>
        </Field>
      )}
    />
  );
}

type TextareaFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  description?: string;
  rows?: number;
  maxLength?: number;
};

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  rows = 3,
  maxLength,
}: TextareaFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={Boolean(fieldState.error)}>
          <FieldLabel htmlFor={String(name)}>{label}</FieldLabel>
          <textarea
            id={String(name)}
            rows={rows}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-invalid={Boolean(fieldState.error)}
            className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
            {...field}
            value={(field.value as string | undefined) ?? ""}
          />
          {description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
          <FieldError>{fieldState.error?.message}</FieldError>
        </Field>
      )}
    />
  );
}
