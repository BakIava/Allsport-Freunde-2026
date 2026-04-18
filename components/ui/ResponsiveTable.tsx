import { ReactNode } from "react";

interface Column<Row> {
  key: keyof Row;
  label: string;
  render?: (row: Row) => ReactNode;
  hideOnMobile?: boolean;
  align?: "left" | "right" | "center";
}

interface ResponsiveTableProps<Row> {
  columns: Column<Row>[];
  data: Row[];
  /** Renders action buttons per row. On mobile, placed below the field list. */
  actions?: (row: Row) => ReactNode;
  keyField: keyof Row;
  emptyMessage?: string;
  className?: string;
  /**
   * Layout for action buttons on mobile.
   * "grid" (default) → grid-cols-2 side-by-side (ideal for 2 buttons).
   * "stack" → flex-col stacked (ideal for 1 or 3+ buttons).
   */
  actionLayout?: "grid" | "stack";
}

const alignClass: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/**
 * ResponsiveTable – Tabelle für Desktop (md+), Card-Stack für Mobile.
 *
 * @example
 * <ResponsiveTable
 *   columns={[
 *     { key: "name", label: "Name" },
 *     { key: "date", label: "Datum", hideOnMobile: true, align: "right" },
 *   ]}
 *   data={rows}
 *   keyField="id"
 *   actions={(row) => <Button onClick={() => edit(row)}>Bearbeiten</Button>}
 * />
 */
export function ResponsiveTable<Row extends Record<string, unknown>>({
  columns,
  data,
  actions,
  keyField,
  emptyMessage = "Keine Einträge",
  className = "",
  actionLayout = "grid",
}: ResponsiveTableProps<Row>) {
  const mobileColumns = columns.filter((c) => !c.hideOnMobile);

  if (data.length === 0) {
    return (
      <div className={`py-12 text-center text-sm text-gray-500 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  const cellValue = (row: Row, col: Column<Row>): ReactNode =>
    col.render ? col.render(row) : String(row[col.key] ?? "");

  return (
    <div className={className}>
      {/* ── Desktop: klassische Tabelle ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  scope="col"
                  className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap ${alignClass[col.align ?? "left"]}`}
                >
                  {col.label}
                </th>
              ))}
              {actions && (
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide"
                >
                  Aktionen
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row) => (
              <tr
                key={String(row[keyField])}
                className="hover:bg-gray-50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`px-4 py-3 text-sm text-gray-900 ${alignClass[col.align ?? "left"]}`}
                  >
                    {cellValue(row, col)}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right text-sm">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: Card-Stack ── */}
      <div className="md:hidden space-y-3">
        {data.map((row) => (
          <div
            key={String(row[keyField])}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            <dl className="space-y-2">
              {mobileColumns.map((col) => (
                <div key={String(col.key)}>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">
                    {col.label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900">
                    {cellValue(row, col)}
                  </dd>
                </div>
              ))}
            </dl>
            {actions && (
              <div
                className={`mt-3 pt-3 border-t border-gray-100 ${
                  actionLayout === "stack"
                    ? "flex flex-col gap-2"
                    : "grid grid-cols-2 gap-2"
                }`}
              >
                {actions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
