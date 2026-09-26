import { EmptyState } from "../../components/ui/primitives";

export function NotAvailable() {
  return (
    <section className="panel">
      <h1 className="page-title">This section is not available</h1>
      <EmptyState title="Not built" body="This screen is not part of the current operations console. Overview is the only working section." />
    </section>
  );
}
