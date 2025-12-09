'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'excel' | 'json'>('excel');
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/extract-data', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      setData(result);

      let status = "Success";
      if (result.validation_log) {
        status = result.validation_log.includes("Fixed") ? "Fixed" : "Review Needed";
      }

      await supabase.from('documents').insert({
        user_id: user.id,
        filename: file.name,
        vendor_name: result.vendor_name,
        total_amount: result.total_amount,
        status: status,
        extracted_data: result
      });

    } catch (err) {
      alert("Error extracting data");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (!data) return;
    const response = await fetch('http://127.0.0.1:8000/generate-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${data.vendor_name}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (!user) return <div className="p-10 text-center font-sans text-gray-500">Loading DocuMind...</div>;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      
      {/* HEADER */}
      <nav className="w-full bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
           <span className="text-2xl font-extrabold text-blue-700 tracking-tight">DocuMind</span>
           <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-100 uppercase tracking-wide">Beta</span>
        </div>
        <div className="flex items-center gap-4">
            {/* 👇 NEW DASHBOARD BUTTON 👇 */}
            <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
                View Dashboard
            </Link>
            <div className="h-4 w-px bg-slate-300"></div>
            
            <span className="text-sm font-semibold text-slate-700 hidden sm:block">{user.email}</span>
            <button 
                onClick={handleLogout}
                className="text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium transition"
            >
                Sign Out
            </button>
        </div>
      </nav>
      
      <div className="flex flex-col items-center p-8 max-w-6xl mx-auto w-full">
        {/* HERO */}
        <div className="text-center max-w-2xl mb-10">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mt-8 mb-3">AI Invoice Extractor</h1>
            <p className="text-slate-500 text-lg">Upload a PDF. We'll handle the math.</p>
        </div>

        {/* UPLOAD CARD */}
        <div className="w-full max-w-xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-12 hover:shadow-md transition-shadow">
            <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-10 hover:bg-slate-50 transition-all text-center cursor-pointer group">
                <input 
                    type="file" 
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl group-hover:scale-110 transition-transform">📄</span>
                    <p className="text-slate-600 font-medium text-lg">
                        {file ? file.name : "Click to Upload Invoice PDF"}
                    </p>
                    {!file && <p className="text-slate-400 text-sm">Supports PDF only (Max 5MB)</p>}
                </div>
            </div>
            <button 
                onClick={handleUpload}
                disabled={isLoading || !file}
                className={`mt-6 w-full py-3.5 px-6 rounded-xl text-white font-bold text-lg transition-all shadow-sm
                    ${isLoading ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'}`}
            >
                {isLoading ? "Processing..." : "Extract Data"}
            </button>
        </div>

        {/* CURRENT RESULT (Only shows after upload) */}
        {data && (
            <div className="w-full bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">{data.vendor_name}</h2>
                        <div className="flex gap-3 mt-2">
                            <span className="text-slate-500 text-sm font-medium bg-slate-100 px-3 py-1 rounded-full">#{data.invoice_number}</span>
                            <span className="text-slate-500 text-sm font-medium bg-slate-100 px-3 py-1 rounded-full">{data.invoice_date}</span>
                        </div>
                        {data.validation_log && (
                            <div className={`mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border ${
                            data.validation_log.includes("Fixed") 
                                ? "bg-green-50 text-green-700 border-green-200" 
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                                <span>{data.validation_log.includes("Fixed") ? "✨" : "⚠️"}</span>
                                {data.validation_log}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setViewMode('excel')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'excel' ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Spreadsheet
                        </button>
                        <button 
                            onClick={() => setViewMode('json')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'json' ? 'bg-slate-100 text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            JSON
                        </button>
                         <button 
                            onClick={() => downloadExcel()}
                            className="ml-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                        >
                            Download Excel
                        </button>
                    </div>
                </div>

                {viewMode === 'excel' && (
                    <div className="overflow-hidden border border-slate-200 rounded-xl">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Description</th>
                                    <th className="px-6 py-4 text-right font-bold">Qty</th>
                                    <th className="px-6 py-4 text-right font-bold">Unit Price</th>
                                    <th className="px-6 py-4 text-right font-bold">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.line_items.map((item: any, index: number) => (
                                    <tr key={index} className="bg-white hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{item.description}</td>
                                        <td className="px-6 py-4 text-right text-slate-600">{item.quantity}</td>
                                        <td className="px-6 py-4 text-right text-slate-600">{data.currency} {item.unit_price.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900">{data.currency} {item.total_price.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {data.tax_amount > 0 && (
                                    <tr className="bg-slate-50/50">
                                        <td className="px-6 py-4 font-medium text-right text-slate-500" colSpan={3}>Tax / VAT</td>
                                        <td className="px-6 py-4 text-right font-semibold text-slate-700">
                                            {data.currency} {data.tax_amount.toFixed(2)}
                                        </td>
                                    </tr>
                                )}
                                <tr className="bg-blue-50/50">
                                    <td className="px-6 py-4 font-bold text-slate-900" colSpan={3}>TOTAL AMOUNT</td>
                                    <td className="px-6 py-4 text-right font-extrabold text-blue-700 text-lg">
                                        {data.currency} {data.total_amount.toFixed(2)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
                {viewMode === 'json' && (
                    <div className="bg-slate-900 text-green-400 p-6 rounded-xl overflow-auto max-h-96 font-mono text-sm shadow-inner">
                        <pre>{JSON.stringify(data, null, 2)}</pre>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}