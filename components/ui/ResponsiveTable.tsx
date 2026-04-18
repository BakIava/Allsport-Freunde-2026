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
  /** Renders action buttons per row. On desktop: right-aligned in last column. On mobile: below fields. */
  actions?: (row: Row) => ReactNode;
  keyField: keyof Row;
  emptyMessage?: string;
  className?: string;
  /**
   * Layout for action buttons on mobile.
   * "grid" (default) → grid-cols-2 side-by-side (ideal for 2 labeled buttons).
   * "stack" → flex-col stacked (ideal for 1 or 3+ labeled buttons).
   */
  actionLayout?: "grid" | "stack";
  /** Extra Tailwind classes added to the desktop table's wrapper div (e.g. "border rounded-lg"). */
  tableWrapperClassName?: string;
  /**
   * Returns extra Tailwind classes per row.
   * Desktop: appended to <tr>. Mobile: replaces the default card bg/border classes.
   * Example: (row) => row.isDraft ? "bg-amber-50/40 border-amber-200" : "bg-white border-gray-200"
   */
  rowClassName?: (row: Row) => string;
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
 *   tableWrapperClassName="border rounded-lg"
 *   actions={(row) => <Button onClick={() => edit(row)}>Bearbeiten</Button>}
 * />
 */
export function ResponsiveTable<Row extends object>({
  columns,
  data,
  actions,
  keyField,
  emptyMessage = "Keine Einträge",
  className = "",
  actionLayout = "grid",
  tableWrapperClassName = "",
  rowClassName,
}: ResponsiveTableProps<Row>) {
  const mobileColumns = columns.filter((c) => !c.hideOnMobile);

  if (data.length === 0) {
    return (
      <div className={`py-12 text-center text-sm text-gray-500 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  // Cast through unknown so we can call String() on any value without Record<string,unknown> constraint.
  const valueOf = (row: Row, key: keyof Row): unknown =>
    (row as Record<PropertyKey, unknown>)[key];

  const cellValue = (row: Row, col: Column<Row>): ReactNode =>
    col.render ? col.render(row) : String(valueOf(row, col.key) ?? "");

  return (
    <div className={className}>
      {/* ── Desktop: klassische Tabelle ── */}
      <div className={`hidden md:block overflow-x-auto ${tableWrapperClassName}`}>
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
                key={String(valueOf(row, keyField))}
                className={`hover:bg-gray-50 transition-colors ${rowClassName?.(row) ?? ""}`}
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
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-end gap-1">
                      {actions(row)}
                    </div>
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
            key={String(valueOf(row, keyField))}
            className={`border rounded-lg p-4 shadow-sm ${rowClassName?.(row) ?? "bg-white border-gray-200"}`}
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
