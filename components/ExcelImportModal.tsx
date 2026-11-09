'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExcelImportModal({
  isOpen,
  onClose,
  onSuccess,
}: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resetBeforeImport, setResetBeforeImport] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{
    totalRows: number;
    inserted: number;
    updated: number;
    errorCount: number;
    errors: { row: number; reason: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        setErrorMsg('Unsupported file format. Please upload a .xlsx or .xls file.');
        return;
      }
      setFile(selected);
      setErrorMsg(null);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        setErrorMsg('Unsupported file format. Please upload a .xlsx or .xls file.');
        return;
      }
      setFile(selected);
      setErrorMsg(null);
      setResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/customers/template';
  };

  const handleSubmit = async () => {
    if (!file) {
      setErrorMsg('Please select an Excel file first.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (resetBeforeImport) {
        formData.append('reset', 'true');
      }

      const res = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process Excel file.');
      }

      setResult(data);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Import Customers from Excel
              </h2>
              <p className="text-xs text-slate-500">
                Bulk upload or update customer directory from spreadsheet (.xlsx / .xls)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Step 1: Download Template & 4-Column Specification */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-blue-900">
                  Standard 4-Column Upload Template
                </div>
                <p className="text-xs text-blue-700 mt-0.5">
                  Only 4 columns are required in your spreadsheet. All other attributes are derived automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Template</span>
              </button>
            </div>

            {/* 4 Required Columns Pill List */}
            <div className="pt-2 border-t border-blue-200/60 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-semibold text-blue-950 mr-1">Required Columns:</span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 font-mono font-bold text-blue-900">1. Customer Name</span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 font-mono font-bold text-blue-900">2. Customer ID</span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 font-mono font-bold text-blue-900">3. Service ID</span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 font-mono font-bold text-blue-900">4. Service Name</span>
            </div>
            <p className="text-[11px] text-blue-800/80">
              ⚡ <strong>System Automated Processing:</strong> Node count is calculated from Service ID (e.g. <code>.2</code> = 2 nodes), and Target SLA is auto-assigned from Service Name (Prime = 99.5%, Dedicated Lite = 98%, etc.).
            </p>
            <div className="pt-2 border-t border-blue-200/60 flex items-start gap-1.5 text-[11px] text-blue-900">
              <span className="font-bold shrink-0">🔑 Unique Identifier:</span>
              <span>
                <strong>Service ID</strong> is the unique key for each service record. A single customer (same Customer ID) can have multiple different Service IDs, and each will be created and maintained independently without overwriting.
              </span>
            </div>
          </div>

          {/* Step 2: Dropzone */}
          {!result ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Excel File
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center ${file
                      ? 'border-emerald-400 bg-emerald-50/30'
                      : 'border-slate-300 hover:border-orange-400 bg-slate-50 hover:bg-orange-50/20'
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${file
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-orange-100 text-orange-600'
                      }`}
                  >
                    <Upload className="w-6 h-6" />
                  </div>

                  {file ? (
                    <div>
                      <div className="text-sm font-bold text-slate-800">
                        {file.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB — Click to change file
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-semibold text-slate-700">
                        Drag & drop Excel file here, or{' '}
                        <span className="text-orange-600 font-bold">Browse</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Supports Microsoft Excel (.xlsx, .xls)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reset Before Import Option */}
              {file && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                    <input
                      type="checkbox"
                      checked={resetBeforeImport}
                      onChange={(e) => setResetBeforeImport(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <span>
                      <strong>Clean existing database</strong> before importing this file
                    </span>
                  </label>
                  {resetBeforeImport && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md shrink-0">
                      Fresh Replace
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Result Success Summary */}
          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Import Completed Successfully!</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200/60">
                    <div className="text-xs text-slate-500">Total Rows</div>
                    <div className="text-base font-black text-slate-800">
                      {result.totalRows}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200/60">
                    <div className="text-xs text-emerald-600 font-semibold">
                      New Records
                    </div>
                    <div className="text-base font-black text-emerald-600">
                      +{result.inserted}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200/60">
                    <div className="text-xs text-blue-600 font-semibold">
                      Updated
                    </div>
                    <div className="text-base font-black text-blue-600">
                      {result.updated}
                    </div>
                  </div>
                </div>
              </div>

              {result.errorCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <div className="font-bold mb-1">
                    Notes ({result.errorCount} rows skipped):
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {result.errors.map((e, idx) => (
                      <li key={idx}>{e.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={result ? handleReset : onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            {result ? 'Upload Another' : 'Cancel'}
          </button>

          {!result ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!file || isUploading}
              className={`inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold shadow-xs transition ${file && !isUploading
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Start Import</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
