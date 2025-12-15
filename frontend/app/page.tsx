'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, CheckCircle, AlertTriangle, Download, 
  Scale, Search, Zap, LayoutDashboard, XCircle, X, Sparkles,
  Layers, Loader2, LogIn, ArrowRight 
} from 'lucide-react';

export default function Home() {
  // 🌍 ENVIRONMENT SWITCH
  const API_URL = process.env.NODE_ENV === 'development' 
    ? 'http://127.0.0.1:8000' 
    : 'https://documind-ai-document-engine.onrender.com';

  const [user, setUser] = useState<any>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [docType, setDocType] = useState<string>('auto');
  const router = useRouter();

  // 1. CHECK USER SESSION
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setFiles(Array.from(e.target.files));
        setErrorMessage(null);
        setResults([]); 
    }
  };

  // 2. THE FIXED UPLOAD FUNCTION
  const handleBatchUpload = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setResults([]);

    const newResults: any[] = [];

    for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i);
        const file = files[i];
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('doc_type', docType);

        // 👇 THIS IS THE CRITICAL FIX WE ADDED
        if (user) {
            formData.append('user_id', user.id);
        } else {
            formData.append('user_id', 'guest_mode');
        }
        // 👆 END FIX

        try {
            if (i > 0) await new Promise(r => setTimeout(r, 1000));

            const response = await fetch(`${API_URL}/extract-data`, { method: 'POST', body: formData });
            
            if (!response.ok) {
                const errData = await response.json();
                if (response.status === 429) throw new Error("Quota Exceeded");
                throw new Error(errData.detail || "Failed");
            }

            const result = await response.json();
            
            let status = "Success";
            if (result.document_type === 'invoice') {
               if (result.validation_log?.includes("Fixed")) status = "Fixed";
               else if (result.validation_log?.includes("Flagged")) status = "Review Needed";
            }

            // Only save to DB if user is logged in
            if (user) {
                await supabase.from('documents').insert({
                    user_id: user.id, filename: file.name, vendor_name: result.vendor_name,
                    total_amount: result.total_amount, status: status, extracted_data: result
                });
            }

            newResults.push({ ...result, success: true, original_name: file.name });
            setResults([...newResults]);

        } catch (err: any) {
            console.error(err);
            newResults.push({ success: false, original_name: file.name, error: err.message });
            setResults([...newResults]);
        }
    }

    setIsProcessing(false);
    setCurrentFileIndex(null);
  };

  const downloadReport = async (data: any) => {
    const endpoint = data.document_type === 'contract' ? 'generate-summary' : 'generate-excel';
    const ext = data.document_type === 'contract' ? 'txt' : 'xlsx';
    try {
        const response = await fetch(`${API_URL}/${endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `DocuMind_${data.vendor_name || 'Report'}.${ext}`;
        document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { alert("Download failed."); }
  };

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-slate-50 selection:bg-blue-100">
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 blur-[100px]" />
      </div>

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto bg-white/70 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="bg-gradient-to-tr from-blue-600 to-purple-600 text-white p-1.5 rounded-lg"><Zap className="w-5 h-5 fill-current" /></div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">DocuMind</span>
            </div>
            
            <div className="flex items-center gap-6">
                {user ? (
                    <>
                        <Link href="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition flex items-center gap-2 group">
                            <LayoutDashboard className="w-4 h-4 group-hover:scale-110 transition-transform" /> Dashboard
                        </Link>
                        <div className="h-4 w-px bg-slate-300/50"></div>
                        <button onClick={handleLogout} className="text-sm font-semibold text-slate-500 hover:text-red-500 transition">Sign Out</button>
                    </>
                ) : (
                    <Link href="/login" className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                        <LogIn className="w-4 h-4" /> Sign In
                    </Link>
                )}
            </div>
        </div>
      </nav>
      
      <div className="relative z-10 flex flex-col items-center pt-32 pb-20 px-6 max-w-6xl mx-auto">
        
        {/* HERO */}
        <div className="text-center max-w-3xl mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {!user && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                    Guest Mode Active • Data not saved
                </div>
            )}
            
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                Turn Documents into <br/>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-gradient">Actionable Data.</span>
            </h1>
            <p className="text-lg text-slate-500 mb-8 max-w-2xl mx-auto leading-relaxed">
                Stop manual data entry. Upload unstructured Invoices or Contracts and let the Multi-Agent AI handle the rest.
            </p>
        </div>

        {/* BATCH UPLOAD CARD */}
        <div className="w-full max-w-xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative w-full bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/50">
                
                {/* TOGGLE */}
                <div className="flex justify-center mb-6">
                    <div className="bg-slate-100 p-1 rounded-lg flex gap-1 shadow-inner">
                        <button onClick={() => setDocType('auto')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${docType === 'auto' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Sparkles className="w-3.5 h-3.5" /> Auto</button>
                        <button onClick={() => setDocType('invoice')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${docType === 'invoice' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><FileText className="w-3.5 h-3.5" /> Invoice</button>
                        <button onClick={() => setDocType('contract')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${docType === 'contract' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Scale className="w-3.5 h-3.5" /> Contract</button>
                    </div>
                </div>

                {/* DROPZONE */}
                <div className="relative border-2 border-dashed border-slate-300/60 rounded-xl p-10 hover:bg-blue-50/50 hover:border-blue-400/50 transition-all text-center cursor-pointer group-hover:scale-[1.01] duration-300">
                    <input type="file" multiple accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                    <div className="flex flex-col items-center gap-4 transition-transform duration-300 group-hover:-translate-y-1">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <Layers className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-slate-700 font-bold text-lg">{files.length > 0 ? `${files.length} files selected` : "Drop files here"}</p>
                            <p className="text-slate-400 text-sm mt-1">{files.length > 0 ? "Ready to batch process" : "Upload multiple PDFs, Words, or Images"}</p>
                        </div>
                    </div>
                </div>

                {errorMessage && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 relative">
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-red-800">Processing Failed</h4>
                            <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
                        </div>
                        <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-700 transition p-1 hover:bg-red-100 rounded-full"><X className="w-4 h-4" /></button>
                    </div>
                )}

                <button 
                    onClick={handleBatchUpload} disabled={isProcessing || files.length === 0}
                    className={`mt-6 w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg flex justify-center items-center gap-2 transition-all duration-300 ${isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]'}`}
                >
                    {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing {currentFileIndex !== null ? `${currentFileIndex + 1}/${files.length}` : ''}...</> : <><Search className="w-5 h-5" /> Start Batch Analysis</>}
                </button>
            </div>
        </div>

        {/* RESULTS & UPSELL */}
        {results.length > 0 && (
            <div className="w-full max-w-2xl mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-4">
                
                {!user && (
                    <div className="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center shadow-xl mb-6">
                        <div>
                            <h3 className="font-bold text-lg">Don't lose your data!</h3>
                            <p className="text-slate-400 text-sm mt-1">These results will disappear when you refresh.</p>
                        </div>
                        <Link href="/login" className="bg-white text-slate-900 px-5 py-2.5 rounded-lg font-bold hover:bg-blue-50 transition flex items-center gap-2">
                            Create Account <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}

                <h3 className="text-xl font-bold text-slate-800 mb-4 px-2">Analysis Results</h3>
                
                {results.map((res, idx) => (
                    <div key={idx} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 p-5 rounded-xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            {res.success ? (
                                <div className={`p-2 rounded-full ${res.document_type === 'contract' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {res.document_type === 'contract' ? <Scale className="w-5 h-5"/> : <FileText className="w-5 h-5"/>}
                                </div>
                            ) : (
                                <div className="p-2 rounded-full bg-red-100 text-red-600"><AlertTriangle className="w-5 h-5"/></div>
                            )}
                            
                            <div>
                                <h4 className="font-bold text-slate-800">{res.vendor_name || res.original_name}</h4>
                                <p className="text-xs text-slate-500 font-mono">
                                    {res.success ? (
                                        <span className="flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3 text-emerald-500"/> Success • {res.document_type.toUpperCase()}
                                        </span>
                                    ) : (
                                        <span className="text-red-500">Failed: {res.error}</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {res.success && (
                            <button 
                                onClick={() => downloadReport(res)}
                                className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                title="Download Report"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}