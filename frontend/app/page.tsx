'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, CheckCircle, AlertTriangle, ShieldCheck, Download, 
  Scale, Calendar, Users, FileWarning, Search, Zap, LayoutDashboard, XCircle, X 
} from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/login');
      else setUser(user);
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
        setErrorMessage(null);
        setData(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setIsLoading(true);
    setErrorMessage(null);
    setData(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/extract-data', { method: 'POST', body: formData });
      
      if (!response.ok) {
          const errData = await response.json();
          if (response.status === 429 || JSON.stringify(errData).includes("429") || JSON.stringify(errData).includes("quota")) {
              throw new Error("AI Usage Limit Reached. Please wait 60 seconds and try again.");
          }
          throw new Error(errData.detail || "Failed to process document.");
      }

      const result = await response.json();
      setData(result);

      let status = "Success";
      if (result.document_type === 'invoice') {
         if (result.validation_log?.includes("Fixed")) status = "Fixed";
         else if (result.validation_log?.includes("Flagged")) status = "Review Needed";
      }

      await supabase.from('documents').insert({
        user_id: user.id,
        filename: file.name,
        vendor_name: result.vendor_name,
        total_amount: result.total_amount,
        status: status,
        extracted_data: result
      });

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!data) return;
    const endpoint = data.document_type === 'contract' ? 'generate-summary' : 'generate-excel';
    const ext = data.document_type === 'contract' ? 'txt' : 'xlsx';
    
    try {
        const response = await fetch(`http://127.0.0.1:8000/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DocuMind_Report.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (e) {
        setErrorMessage("Download failed. Backend connection lost.");
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-medium bg-slate-50">Loading DocuMind...</div>;

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-slate-50 selection:bg-blue-100">
      
      {/* BACKGROUND DECORATION */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 blur-[100px]" />
      </div>

      {/* NAVBAR (Glass) */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto bg-white/70 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="bg-gradient-to-tr from-blue-600 to-purple-600 text-white p-1.5 rounded-lg">
                    <Zap className="w-5 h-5 fill-current" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
                    DocuMind
                </span>
            </div>
            <div className="flex items-center gap-6">
                <Link href="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition flex items-center gap-2 group">
                    <LayoutDashboard className="w-4 h-4 group-hover:scale-110 transition-transform" /> Dashboard
                </Link>
                <div className="h-4 w-px bg-slate-300/50"></div>
                <button onClick={handleLogout} className="text-sm font-semibold text-slate-500 hover:text-red-500 transition">
                    Sign Out
                </button>
            </div>
        </div>
      </nav>
      
      <div className="relative z-10 flex flex-col items-center pt-32 pb-20 px-6 max-w-6xl mx-auto">
        
        {/* HERO SECTION */}
        <div className="text-center max-w-3xl mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                Turn Documents into <br/>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-gradient">
                    Actionable Data.
                </span>
            </h1>
            <p className="text-lg text-slate-500 mb-8 max-w-2xl mx-auto leading-relaxed">
                Stop manual data entry. Upload unstructured Invoices or Contracts and let the Multi-Agent AI handle the rest.
            </p>
        </div>

        {/* UPLOAD CARD (Glass) */}
        <div className="w-full max-w-xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative w-full bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/50">
                
                <div className="relative border-2 border-dashed border-slate-300/60 rounded-xl p-10 hover:bg-blue-50/50 hover:border-blue-400/50 transition-all text-center cursor-pointer group-hover:scale-[1.01] duration-300">
                    <input 
                        type="file" 
                        accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    <div className="flex flex-col items-center gap-4 transition-transform duration-300 group-hover:-translate-y-1">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <FileText className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-slate-700 font-bold text-lg">
                                {file ? file.name : "Drop your file here"}
                            </p>
                            <p className="text-slate-400 text-sm mt-1">
                                {file ? "Ready to analyze" : "PDF, Word (.docx), or Images (.jpg/.png)"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ERROR MESSAGE CARD (Dismissible) */}
                {errorMessage && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 relative">
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-red-800">Processing Failed</h4>
                            <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
                        </div>
                        <button 
                            onClick={() => setErrorMessage(null)} 
                            className="text-red-400 hover:text-red-700 transition p-1 hover:bg-red-100 rounded-full"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <button 
                    onClick={handleUpload}
                    disabled={isLoading || !file}
                    className={`mt-6 w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg flex justify-center items-center gap-2 transition-all duration-300
                        ${isLoading 
                            ? 'bg-slate-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]'}`}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Analyzing...
                        </div> 
                    ) : (
                        <>
                            <Search className="w-5 h-5" /> Analyze Document
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* --- DYNAMIC RESULT VIEW --- */}
        {data && (
            <div className="w-full max-w-4xl mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
                    
                    {/* RESULT HEADER */}
                    <div className="bg-slate-50/50 border-b border-slate-200/60 p-8 flex justify-between items-start">
                        <div>
                            {data.document_type === 'contract' ? (
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                        <Scale className="w-3 h-3" /> Contract
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1 ${
                                        data.overall_risk_level === 'High' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                        <FileWarning className="w-3 h-3" /> Risk: {data.overall_risk_level}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                        <FileText className="w-3 h-3" /> Invoice
                                    </span>
                                    {data.validation_log && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1 ${
                                            data.validation_log.includes("Verified") || data.validation_log.includes("Fixed") ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {data.validation_log.includes("Fixed") ? <ShieldCheck className="w-3 h-3"/> : <CheckCircle className="w-3 h-3"/>}
                                            {data.validation_log.includes("Fixed") ? "Auto-Corrected" : "Verified"}
                                        </span>
                                    )}
                                </div>
                            )}
                            <h2 className="text-3xl font-bold text-slate-800">
                                {data.vendor_name || data.contract_type || "Document Analysis"}
                            </h2>
                            {data.document_type !== 'contract' && (
                                <p className="text-slate-500 mt-1 font-mono text-sm">#{data.invoice_number} • {data.invoice_date}</p>
                            )}
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={downloadReport}
                                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2 text-sm"
                            >
                                <Download className="w-4 h-4" /> Download
                            </button>
                        </div>
                    </div>

                    {/* RESULT BODY */}
                    <div className="p-8">
                        {data.document_type === 'contract' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-blue-600" /> Key Terms
                                    </h3>
                                    <ul className="space-y-3">
                                        {data.key_terms?.map((term: string, i: number) => (
                                            <li key={i} className="text-sm text-slate-600 flex gap-3 items-start">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                                                <span className="leading-relaxed">{term}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-amber-600" /> Risk Analysis
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                                        {data.risk_analysis}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-hidden border border-slate-200/60 rounded-xl">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4">Item</th>
                                            <th className="px-6 py-4 text-right">Qty</th>
                                            <th className="px-6 py-4 text-right">Price</th>
                                            <th className="px-6 py-4 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {data.line_items?.map((item: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-900">{item.description}</td>
                                                <td className="px-6 py-4 text-right text-slate-500">{item.quantity}</td>
                                                <td className="px-6 py-4 text-right text-slate-500">{(item.unit_price || 0).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900">{(item.total_price || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-50/50">
                                            <td className="px-6 py-4 font-bold text-slate-900" colSpan={3}>Total Amount</td>
                                            <td className="px-6 py-4 text-right font-black text-blue-600 text-lg">
                                                {data.currency} {(data.total_amount || 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        )}
      </div>
    </div>
  );
}
