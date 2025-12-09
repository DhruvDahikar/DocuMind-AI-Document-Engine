'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'excel' | 'json'>('excel'); // Toggle State

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
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
    } catch (err) {
      alert("Error extracting data");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (!data) return;
    
    // Send the JSON data back to Python to convert it
    const response = await fetch('http://127.0.0.1:8000/generate-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    // Handle the file download blob
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${data.vendor_name}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 p-8 font-sans">
      <div className="text-center max-w-2xl mb-8">
        <h1 className="text-5xl font-extrabold text-blue-700 tracking-tight">DocuMind</h1>
        <p className="mt-2 text-gray-600">The AI-Powered Invoice Extractor</p>
      </div>

      {/* Upload Section */}
      <div className="w-full max-w-xl bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 hover:bg-blue-50 transition-colors text-center cursor-pointer">
          <input 
            type="file" 
            accept="application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <p className="text-gray-600 font-medium text-lg">
            {file ? `📄 ${file.name}` : "Click to Upload Invoice PDF"}
          </p>
        </div>
        <button 
          onClick={handleUpload}
          disabled={isLoading || !file}
          className={`mt-4 w-full py-3 px-6 rounded-lg text-white font-bold transition-all shadow-md 
            ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isLoading ? "Processing..." : "Extract Data"}
        </button>
      </div>

      {/* RESULTS SECTION */}
      {data && (
        <div className="w-full max-w-5xl bg-white p-6 rounded-xl shadow-xl border border-gray-200 fade-in">
          
          {/* Header & Toggle Controls */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4">
            <div>
              {/* 👇 ENGINEERING BADGE 👇 */}
{data.validation_log && (
  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
    data.validation_log.includes("Fixed") 
      ? "bg-green-100 text-green-700 border-green-200" 
      : "bg-yellow-100 text-yellow-700 border-yellow-200"
  }`}>
    <span>{data.validation_log.includes("Fixed") ? "✨" : "⚠️"}</span>
    {data.validation_log}
  </div>
)}
              
            </div>
            
            <div className="flex gap-3 mt-4 md:mt-0">
               {/* The Toggle Buttons */}
              <div className="bg-gray-100 p-1 rounded-lg flex">
                <button 
                  onClick={() => setViewMode('excel')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'excel' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Spreadsheet View
                </button>
                <button 
                  onClick={() => setViewMode('json')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'json' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Raw JSON
                </button>
              </div>

              {/* The Download Button */}
              <button 
                onClick={downloadExcel}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg shadow font-semibold transition-all"
              >
                <span>📥</span> Download Excel
              </button>
            </div>
          </div>

          {/* VIEW 1: SPREADSHEET (Excel Style) */}
          {viewMode === 'excel' && (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Qty</th>
                    <th className="px-6 py-3 text-right">Unit Price</th>
                    <th className="px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.line_items.map((item: any, index: number) => (
                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{item.description}</td>
                      <td className="px-6 py-4 text-right">{item.quantity}</td>
                      <td className="px-6 py-4 text-right">{data.currency} {item.unit_price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-bold">{data.currency} {item.total_price.toFixed(2)}</td>
                    </tr>
                  ))}
                      {data.tax_amount > 0 && (
                      <tr className="bg-gray-50 text-gray-500">
                        <td className="px-6 py-3 font-medium text-right" colSpan={3}>Tax / VAT</td>
                        <td className="px-6 py-3 text-right font-semibold">
                          {data.currency} {data.tax_amount.toFixed(2)}
                        </td>
                      </tr>
                    )}
                  {/* Total Row */}
                  <tr className="bg-blue-50 border-t-2 border-blue-100">
                    <td className="px-6 py-4 font-bold text-gray-900" colSpan={3}>TOTAL INVOICE AMOUNT</td>
                    <td className="px-6 py-4 text-right font-extrabold text-blue-700 text-lg">
                      {data.currency} {data.total_amount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 2: RAW JSON (Developer Style) */}
          {viewMode === 'json' && (
            <div className="bg-slate-900 text-green-400 p-6 rounded-lg overflow-auto max-h-96 font-mono text-sm shadow-inner">
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}