import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Payment, PaymentStatus, listPayments } from '@/services/api';
import { formatDate, formatMoney } from '@/utils/formatter';

const STATUS_BADGE: Record<PaymentStatus, string> = {
  paid: 'bg-green-100 text-green-700',
  created: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-amber-100 text-amber-700',
};

export default function PaymentsList() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { payments } = await listPayments();
      setPayments(payments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
          <p className="text-gray-600 text-sm">
            Cash and online collections · <span className="font-semibold text-gray-900">{formatMoney(totalPaid)}</span> collected
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-3 rounded-lg">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading payments…</div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No payments recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatMoney(p.amount, p.currency)}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{p.method}</td>
                  <td className="px-4 py-3 text-gray-600">{p.plan || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.razorpayPaymentId || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(p.createdAt, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
