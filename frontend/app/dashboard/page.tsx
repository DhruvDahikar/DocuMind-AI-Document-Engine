'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        fetchHistory(user.id);
      }
    };
    checkUser();
  }, [router]);

  const fetchHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }); // No limit here, show all

    if (data) setHistory(data);
    setLoading(false);
  };

  const downloadExcel = async (doc: any) => {
    const response = await fetch('http://127.0.0.1:8000/generate-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc.extracted_data),
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${doc.vendor_name}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <nav className="w-full bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <Link href="/" className="text-2xl font-extrabold text-blue-700 tracking-tight hover:opacity-80 transition">DocuMind</Link>
           <span className="text-slate-400 text-sm">/</span>
           <span className="text-slate-600 font-semibold">Dashboard</span>
        </div>
        <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              ← Back to Upload
            </Link>
            <div className="h-4 w-px bg-slate-300"></div>
            <p className="text-sm font-semibold text-slate-700">{user?.email}</p>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-end mb-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Document History</h1>
                <p className="text-slate-500 mt-1">Manage and download your past extractions.</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 shadow-sm">
                Total Documents: <span className="text-blue-600 font-bold ml-1">{history.length}</span>
            </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {history.length === 0 ? (
                <div className="p-12 text-center">
                    <p className="text-slate-400 text-lg mb-4">No documents found.</p>
                    <Link href="/" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                        Upload your first invoice
                    </Link>
                </div>
            ) : (
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                        <tr>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Vendor</th>
                            <th className="px-6 py-4">Filename</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                            <th className="px-6 py-4 text-right">Download</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {history.map((doc) => (
                            <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    {doc.status === 'Fixed' && <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">✨ Fixed</span>}
                                    {doc.status === 'Review Needed' && <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">⚠️ Review</span>}
                                    {doc.status === 'Success' && <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">✓ Success</span>}
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    {new Date(doc.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-900">{doc.vendor_name || "Unknown"}</td>
                                <td className="px-6 py-4 text-slate-500 truncate max-w-[150px]">{doc.filename}</td>
                                <td className="px-6 py-4 text-right font-medium">
                                    {doc.extracted_data?.currency} {doc.total_amount?.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                     <button 
                                        onClick={() => downloadExcel(doc)}
                                        className="text-blue-600 hover:text-blue-800 font-bold text-xs border border-blue-200 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition"
                                    >
                                        📥 Excel
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </div>
    </div>
  );
}