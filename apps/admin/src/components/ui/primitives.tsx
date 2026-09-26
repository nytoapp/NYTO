import { useEffect, useId, useRef, type ReactNode } from "react";
import { pageRange } from "../../lib/pagination";

export function Button({
  children,
  type = "button",
  variant = "primary",
  disabled,
  onClick,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type={type} className={variant === "primary" ? "btn" : "btn secondary"} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
  error,
  list,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  required?: boolean;
  error?: string;
  list?: string;
  inputMode?: "text" | "decimal" | "tel" | "url";
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <label className="field" htmlFor={id}>
      <span>{label}{required ? <span className="req"> Required</span> : null}</span>
      <input
        id={id}
        className="text-field"
        type={type}
        value={value}
        autoComplete={autoComplete}
        required={required}
        list={list}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <span className="field-error" id={errorId}>{error}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <label className="field" htmlFor={id}>
      <span>{label}{required ? <span className="req"> Required</span> : null}</span>
      <select
        id={id}
        className="text-field"
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error ? <span className="field-error" id={errorId}>{error}</span> : null}
    </label>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}

export function StatusPill({ tone, children }: { tone: "ok" | "warn" | "neutral" | "danger"; children: ReactNode }) {
  return (
    <span className="status-pill">
      <span className={`status-dot ${tone}`} aria-hidden="true" />
      {children}
    </span>
  );
}

export function Dialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);
  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} onClose={onClose}>
      <h2 id={titleId}>{title}</h2>
      <div className="stack" style={{ marginTop: 12 }}>{children}</div>
    </dialog>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p className="muted">{body}</p>
    </div>
  );
}

export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return (
    <div className="error-block" role="alert">
      <strong>{title}</strong>
      <p>{body}</p>
      {onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : null}
    </div>
  );
}

export function Skeleton({ height = 16 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} aria-hidden="true" />;
}

export function Breadcrumb({ section }: { section: string }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <span className="muted">Operations</span>
      <span aria-hidden="true">/</span>
      <strong>{section}</strong>
    </nav>
  );
}

export function Pagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (page: number) => void }) {
  const range = pageRange(page, pageCount);
  return (
    <div className="pager">
      <Button variant="secondary" disabled={!range.hasPrevious} onClick={() => onPage(range.page - 1)}>Previous</Button>
      <span className="meta">Page {range.page} of {range.pageCount}</span>
      <Button variant="secondary" disabled={!range.hasNext} onClick={() => onPage(range.page + 1)}>Next</Button>
    </div>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={tab.id === value} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
