"use client";

import type { OrderRecord } from "@/lib/orders-data";
import { formatPrice } from "@/lib/utils";

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function display(value: string | undefined | null) {
  return value?.trim() ? value : null;
}

function paymentStatusLabel(status: OrderRecord["paymentStatus"]) {
  return status.replaceAll("_", " ");
}

export function AdminInvoice({ order }: { order: OrderRecord }) {
  const address = order.billingAddress;

  return (
    <main className="invoice-page min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: white !important; }
          .invoice-page { min-height: auto !important; padding: 0 !important; background: white !important; }
          .invoice-actions { display: none !important; }
          .invoice-sheet { max-width: none !important; box-shadow: none !important; border: 0 !important; }
          .invoice-table thead { display: table-header-group; }
          .invoice-table tr { break-inside: avoid; }
        }
      `}</style>

      <div className="invoice-actions mx-auto mb-4 flex max-w-4xl justify-end gap-3">
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700">
          Print / Save as PDF
        </button>
      </div>

      <article className="invoice-sheet mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl sm:p-10">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <p className="text-2xl font-black tracking-tight text-slate-950">UNIQUE SHOPEE</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Invoice</p>
          </div>
          <dl className="text-right text-sm">
            <div><dt className="inline font-semibold text-slate-500">Order #: </dt><dd className="inline font-bold">{order.orderNumber}</dd></div>
            <div className="mt-1"><dt className="inline font-semibold text-slate-500">Date: </dt><dd className="inline">{formatDate(order.placedAtRaw)}</dd></div>
          </dl>
        </header>

        <section className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Bill to</h2>
            <p className="mt-2 font-bold">{display(address.name) ?? "Customer"}</p>
            <div className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
              {[address.line1, address.line2, [address.city, address.state, address.pincode].filter(Boolean).join(", ")].filter(Boolean).join("\n") || "Billing address unavailable"}
            </div>
            {display(address.phone) ? <p className="mt-2 text-sm text-slate-600">Phone: {address.phone}</p> : null}
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Payment</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Method</dt><dd className="font-semibold text-right">{order.paymentMethod}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Status</dt><dd className="font-semibold capitalize text-right">{paymentStatusLabel(order.paymentStatus)}</dd></div>
              {display(order.paymentReference) ? <div className="flex justify-between gap-4"><dt className="text-slate-500">Reference</dt><dd className="max-w-[15rem] break-all font-semibold text-right">{order.paymentReference}</dd></div> : null}
            </dl>
          </div>
        </section>

        <section className="py-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Items</h2>
          <div className="overflow-x-auto">
            <table className="invoice-table min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-slate-200 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="py-3 pr-3">Product</th><th className="px-2 py-3">Variant / Pack</th><th className="px-2 py-3 text-right">Qty</th><th className="px-2 py-3 text-right">Unit Price</th><th className="px-2 py-3 text-right">Discount</th><th className="px-2 py-3 text-right">GST</th><th className="py-3 pl-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 align-top">
                    <td className="py-4 pr-3"><p className="font-semibold">{item.name}</p>{item.sku ? <p className="mt-1 text-xs text-slate-500">SKU: {item.sku}</p> : null}{item.shadeName || item.shadeFamily || item.shadeCode ? <p className="mt-1 text-xs text-slate-600">{[item.shadeFamily, item.shadeName, item.shadeCode].filter(Boolean).join(" • ")}</p> : null}</td>
                    <td className="px-2 py-4 text-xs text-slate-600">{[item.baseName, item.finish, item.packSize].filter(Boolean).join(" • ") || item.variant}</td>
                    <td className="px-2 py-4 text-right">{item.quantity}</td>
                    <td className="px-2 py-4 text-right whitespace-nowrap">{formatPrice(item.finalUnitPrice ?? item.price)}</td>
                    <td className="px-2 py-4 text-right whitespace-nowrap">{item.discountAmount ? `-${formatPrice(item.discountAmount)}` : formatPrice(0)}</td>
                    <td className="px-2 py-4 text-right whitespace-nowrap">{formatPrice(item.gstAmount ?? 0)}{item.gstRate ? <span className="block text-xs text-slate-500">{item.gstRate}%</span> : null}</td>
                    <td className="py-4 pl-2 text-right font-semibold whitespace-nowrap">{formatPrice(item.lineTotal ?? item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ml-auto max-w-sm border-t border-slate-200 pt-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-600">Subtotal (incl. GST)</dt><dd>{formatPrice(order.subtotal)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-600">Product Savings</dt><dd>{formatPrice(order.discount)}</dd></div>
            {order.couponApplied ? <div className="flex justify-between gap-4"><dt className="text-slate-600">Coupon Savings ({order.couponApplied})</dt><dd>{formatPrice(order.couponDiscount)}</dd></div> : null}
            <div className="flex justify-between gap-4"><dt className="text-slate-600">Shipping</dt><dd>{formatPrice(order.shipping)}</dd></div>
            <div className="mt-3 flex justify-between gap-4 border-t border-slate-200 pt-3 text-lg font-black"><dt>Grand Total</dt><dd>{formatPrice(order.grandTotal)}</dd></div>
          </dl>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-sm text-slate-500">Thank you for shopping with UniqueShopee.</footer>
      </article>
    </main>
  );
}
