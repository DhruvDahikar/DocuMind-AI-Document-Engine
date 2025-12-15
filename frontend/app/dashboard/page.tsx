'use client';

import ChatWidget from '@/components/ChatWidget';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, FileText, DollarSign, LogOut, Loader2, 
  PieChart, BarChart3, ShieldAlert, Scale, CheckCircle, X, AlertTriangle, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell, Legend 
} from 'recharts';
import { format } from 'date-fns';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<any[]>([]);
  
  // 🔍 FILTER STATE: 'all' or 'high_risk'
  const [filter, setFilter] = useState<'all' | 'high_risk'>('all');

  const [stats, setStats] = useState({ 
    totalSpend: 0, docCount: 0, contractCount: 0, highRiskCount: 0 
  });
  const [financialData, setFinancialData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any[]>([]);
  const router = useRouter();

  // 🎨 EXPLICIT COLOR MAPPING
  const RISK_COLORS: Record<string, string> = {
    'High Risk': '#ef4444',   // Red
    'Medium Risk': '#f59e0b', // Orange
    'Low Risk': '#22c55e',    // Green
  };
  
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) console.error(error);
      else {
        setDocs(documents || []);
        processAnalytics(documents || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const processAnalytics = (data: any[]) => {
    const invoices = data.filter(d => d.extracted_data?.document_type === 'invoice');
    const contracts = data.filter(d => d.extracted_data?.document_type === 'contract');

    const totalSpend = invoices.reduce((sum, d) => sum + (d.total_amount || 0), 0);
    
    let highRisk = 0, mediumRisk = 0, lowRisk = 0;
    contracts.forEach(c => {
        const risk = c.extracted_data?.overall_risk_level?.toLowerCase() || 'unknown';
        if (risk.includes('high')) highRisk++;
        else if (risk.includes('medium')) mediumRisk++;
        else if (risk.includes('low')) lowRisk++;
    });

    setStats({
      totalSpend,
      docCount: data.length,
      contractCount: contracts.length,
      highRiskCount: highRisk
    });

    // Financial Data
    const monthlyGroups: Record<string, number> = {};
    invoices.forEach(doc => {
      const date = new Date(doc.created_at);
      const month = format(date, 'MMM');
      monthlyGroups[month] = (monthlyGroups[month] || 0) + (doc.total_amount || 0);
    });
    setFinancialData(Object.keys(monthlyGroups).map(m => ({ name: m, amount: monthlyGroups[m] })));

    // Risk Data
    setRiskData([
        { name: 'Low Risk', value: lowRisk },
        { name: 'Medium Risk', value: mediumRisk },
        { name: 'High Risk', value: highRisk }
    ].filter(d => d.value > 0));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const filteredDocs = filter === 'high_risk' 
    ? docs.filter(d => d.extracted_data?.overall_risk_level?.toLowerCase().includes('high'))
    : docs;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-slate-50 selection:bg-blue-100 relative">
      
      {/* 🌌 BACKGROUND GLOW (Matches Landing Page) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 blur-[100px]" />
      </div>

      {/* 💎 GLASS NAVBAR */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto bg-white/70 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl px-6 py-3 flex justify-between items-center">
            
            {/* Logo Area */}
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
                <div className="bg-gradient-to-tr from-blue-600 to-purple-600 text-white p-1.5 rounded-lg">
                    <Zap className="w-5 h-5 fill-current" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
                    DocuMind <span className="text-slate-400 font-medium text-sm ml-1">Dashboard</span>
                </span>
            </Link>

            {/* User Controls */}
            <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-slate-500 hidden sm:block">
                    {user?.email}
                </span>
                <div className="h-4 w-px bg-slate-300/50 hidden sm:block"></div>
                <button onClick={handleLogout} className="text-sm font-bold text-slate-500 hover:text-red-600 transition flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="relative z-10 pt-32 pb-20 px-6 max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900">Executive Overview</h1>
                <p className="text-slate-500 mt-1">Financial auditing and legal risk analysis.</p>
            </div>
            <Link href="/" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 hover:shadow-blue-500/30 transition-all flex items-center gap-2">
                <FileText className="w-4 h-4" /> Upload New File
            </Link>
        </div>

        {/* 📊 STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><DollarSign className="w-8 h-8" /></div>
                <div>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Spend</p>
                    <h3 className="text-3xl font-extrabold text-slate-900">${stats.totalSpend.toLocaleString()}</h3>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Scale className="w-8 h-8" /></div>
                <div>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Active Contracts</p>
                    <h3 className="text-3xl font-extrabold text-slate-900">{stats.contractCount}</h3>
                </div>
            </div>

            {/* 🔴 INTERACTIVE RISK CARD */}
            <div 
                onClick={() => stats.highRiskCount > 0 && setFilter(filter === 'all' ? 'high_risk' : 'all')}
                className={`p-6 rounded-2xl shadow-sm border flex items-center gap-4 transition-all duration-200 backdrop-blur-sm
                    ${stats.highRiskCount > 0 ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' : ''}
                    ${filter === 'high_risk' ? 'ring-2 ring-red-500 ring-offset-2 bg-red-50/90 border-red-200' : 'bg-white/80 border-slate-100'}
                `}
            >
                <div className={`p-3 rounded-xl ${stats.highRiskCount > 0 ? 'bg-red-200 text-red-700' : 'bg-green-100 text-green-600'}`}>
                    {stats.highRiskCount > 0 ? <ShieldAlert className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
                </div>
                <div>
                    <p className={`${stats.highRiskCount > 0 ? 'text-red-600' : 'text-slate-500'} text-sm font-bold uppercase tracking-wider`}>
                        {filter === 'high_risk' ? 'Filter Active' : 'High Risk Alerts'}
                    </p>
                    <h3 className={`text-3xl font-extrabold ${stats.highRiskCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>{stats.highRiskCount}</h3>
                </div>
                {stats.highRiskCount > 0 && filter === 'all' && (
                    <div className="ml-auto text-xs font-bold text-red-400 bg-white px-2 py-1 rounded-md shadow-sm border border-red-100">Click to Filter</div>
                )}
                 {filter === 'high_risk' && (
                    <div className="ml-auto bg-red-200 p-1 rounded-full text-red-700"><X className="w-4 h-4"/></div>
                )}
            </div>
        </div>

        {/* 📈 CHARTS ROW */}
        {docs.length > 0 && filter === 'all' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-500" /> Financial Velocity
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={financialData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `$${val}`} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f1f5f9'}} />
                                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-purple-500" /> Contract Risk Distribution
                    </h3>
                    {riskData.length > 0 ? (
                        <div className="h-64 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie data={riskData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {riskData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name] || '#94a3b8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No legal contracts analyzed yet.</div>
                    )}
                </div>
            </div>
        )}

        {/* 📜 DOCUMENT LIST */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">
                        {filter === 'high_risk' ? <span className="text-red-600 flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> High Risk Contracts Only</span> : "Recent Documents"}
                    </h3>
                    {filter === 'high_risk' && (
                        <button onClick={() => setFilter('all')} className="text-xs text-slate-500 underline hover:text-slate-800 ml-2">Clear Filter</button>
                    )}
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{filteredDocs.length} Found</span>
            </div>
            
            <div className="divide-y divide-slate-100">
                {filteredDocs.length > 0 ? filteredDocs.map((doc) => {
                    const isContract = doc.extracted_data?.document_type === 'contract';
                    const riskRaw = doc.extracted_data?.overall_risk_level || 'Unknown';
                    const risk = riskRaw.toLowerCase();
                    
                    let badgeClass = 'bg-slate-100 text-slate-700'; // Default
                    if (risk.includes('high')) badgeClass = 'bg-red-100 text-red-700';
                    else if (risk.includes('medium')) badgeClass = 'bg-orange-100 text-orange-700';
                    else if (risk.includes('low')) badgeClass = 'bg-green-100 text-green-700';

                    return (
                        <div key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${isContract ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {isContract ? <Scale className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{doc.vendor_name || doc.filename}</p>
                                    <p className="text-xs text-slate-500">{format(new Date(doc.created_at), 'MMM dd, yyyy')} • {doc.filename}</p>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                {isContract ? (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass}`}>
                                        {risk.includes('high') && <ShieldAlert className="w-3 h-3 mr-1" />}
                                        {risk.includes('medium') && <AlertTriangle className="w-3 h-3 mr-1" />}
                                        {risk.includes('low') && <CheckCircle className="w-3 h-3 mr-1" />}
                                        {riskRaw}
                                    </span>
                                ) : (
                                    <p className="font-bold text-slate-900">
                                        {doc.total_amount ? `$${doc.total_amount.toFixed(2)}` : '-'}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="p-8 text-center text-slate-400 text-sm">No documents found matching this filter.</div>
                )}
            </div>
        </div>

      </main>
      <ChatWidget />
    </div>
  );
}