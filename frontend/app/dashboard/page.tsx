'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, CheckCircle, AlertTriangle, ShieldCheck, Download, 
  Scale, FileWarning, Search, ArrowLeft, LayoutDashboard, Zap, Calendar 
} from 'lucide-react';

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
      .order('created_at', { ascending: false });

    if (data) setHistory(data);
    setLoading(false);
  };

  const downloadReport = async (doc: any) => {
    const isContract = doc.extracted_data.document_type === 'contract';
    const endpoint = isContract ? 'generate-summary' : 'generate-excel';
    const ext = isContract ? 'txt' : 'xlsx';
    
    try {
        const response = await fetch(`http://127.0.0.1:8000/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(doc.extracted_data),
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DocuMind_${doc.vendor_name}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (e) {
        alert("Download failed. The backend might be offline.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-medium bg-slate-50">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-slate-50 selection:bg-blue-100">
      
      {/* BACKGROUND DECORATION */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/10 blur-[100px]" />
      </div>

      {/* NAVBAR (Glass) */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto bg-white/70 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl px-6 py-3 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 group">
                <div className="bg-gradient-to-tr from-blue-600 to-purple-600 text-white p-1.5 rounded-lg group-hover:scale-105 transition-transform">
                    <Zap className="w-5 h-5 fill-current" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
                    DocuMind
                </span>
            </Link>
            <div className="flex items-center gap-6">
                <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Upload New
                </Link>
                <div className="h-4 w-px bg-slate-300/50"></div>
                <span className="text-sm font-medium text-slate-500">{user.email}</span>
            </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      {/* Changed max-w-6xl to max-w-7xl for wider table */}
      <div className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">Document History</h1>
                <p className="text-slate-500 text-lg">Manage your past invoices and contract analyses.</p>
            </div>
            
            {/* STATS CARD */}
            <div className="bg-white/60 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/60 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <LayoutDashboard className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Documents</p>
                    <p className="text-2xl font-black text-slate-800">{history.length}</p>
                </div>
            </div>
        </div>

        {/* GLASS TABLE CARD */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden shadow-xl">
            {history.length === 0 ? (
                <div className="p-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Search className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">No documents found</h3>
                    <p className="text-slate-500 mb-8 max-w-xs mx-auto">Upload your first invoice or contract to see the magic happen.</p>
                    <Link href="/" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all inline-flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Start Analyzing
                    </Link>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase font-bold border-b border-slate-200/60">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Date Processed</th>
                                <th className="px-6 py-4">Vendor / Party</th>
                                <th className="px-6 py-4 text-right">Summary</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-transparent">
                            {history.map((doc) => (
                                <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors group">
                                    {/* STATUS */}
                                    <td className="px-6 py-4">
                                        {doc.status === 'Fixed' && (
                                            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200 shadow-sm">
                                                <ShieldCheck className="w-3 h-3" /> Auto-Fixed
                                            </span>
                                        )}
                                        {doc.status === 'Review Needed' && (
                                            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-200 shadow-sm">
                                                <AlertTriangle className="w-3 h-3" /> Review
                                            </span>
                                        )}
                                        {doc.status === 'Success' && (
                                            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-200 shadow-sm">
                                                <CheckCircle className="w-3 h-3" /> Success
                                            </span>
                                        )}
                                    </td>

                                    {/* TYPE */}
                                    <td className="px-6 py-4">
                                        {doc.extracted_data?.document_type === 'contract' ? (
                                            <div className="flex items-center gap-2 text-purple-700 font-bold text-xs uppercase tracking-wide">
                                                <div className="p-1.5 bg-purple-100 rounded-md">
                                                    <Scale className="w-3 h-3" /> 
                                                </div>
                                                Contract
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-wide">
                                                <div className="p-1.5 bg-slate-100 rounded-md">
                                                    <FileText className="w-3 h-3" /> 
                                                </div>
                                                Invoice
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-slate-500 font-medium">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 font-bold text-slate-900">
                                        {doc.vendor_name || "Unknown"}
                                    </td>

                                    {/* SUMMARY (Amount vs Risk) */}
                                    <td className="px-6 py-4 text-right font-medium">
                                        {doc.extracted_data?.document_type === 'contract' ? (
                                            <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${
                                                doc.extracted_data.overall_risk_level === 'High' 
                                                    ? 'bg-red-50 text-red-700 border-red-200' 
                                                    : 'bg-green-50 text-green-700 border-green-200'
                                            }`}>
                                                Risk: {doc.extracted_data.overall_risk_level}
                                            </span>
                                        ) : (
                                            <span className="font-mono text-slate-600">
                                                {doc.extracted_data?.currency} {doc.total_amount?.toFixed(2)}
                                            </span>
                                        )}
                                    </td>

                                    {/* ACTION */}
                                    <td className="px-6 py-4 text-right">
                                         <button 
                                            onClick={() => downloadReport(doc)}
                                            className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all group-hover:opacity-100 opacity-70"
                                            title="Download Report"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}