'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Checkbox,
  Badge,
  InfoTooltip,
} from '@/components/ui';

export interface ExcelImportModalProps {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        setErrorMsg('Unsupported file format. Please upload a .xlsx or .xls spreadsheet.');
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
        setErrorMsg('Unsupported file format. Please upload a .xlsx or .xls spreadsheet.');
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
      toast.success(`Import complete: ${data.inserted} added, ${data.updated} updated`);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      toast.error(msg);
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>Import Customers from Excel</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto space-y-4 py-2 flex-1">
          {/* Template info card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-800">
                Customer Spreadsheet Template
              </span>
              <InfoTooltip
                content={
                  <div className="space-y-1">
                    <p className="font-semibold text-white">Required columns (*):</p>
                    <p>Customer Name, Customer ID, Service ID</p>
                    <p className="text-slate-400 mt-1">Optional: Service Plan, Target SLA, Engine, Graph/Sensor ID</p>
                  </div>
                }
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadTemplate}
              className="h-7 text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Template
            </Button>
          </div>

          {/* Dropzone */}
          {!result && (
            <div className="space-y-3">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
                  file
                    ? 'border-emerald-400 bg-emerald-50/20'
                    : 'border-slate-300 hover:border-orange-400 bg-white hover:bg-orange-50/10'
                }`}
              >
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2.5 ${
                    file ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Upload className="w-5 h-5 stroke-[1.75]" />
                </div>

                {file ? (
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">{file.name}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB — Click to change file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[13px] font-medium text-slate-700">
                      Drag & drop Excel file here, or{' '}
                      <span className="text-orange-600 font-semibold">Browse</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Supports Microsoft Excel (.xlsx, .xls)
                    </p>
                  </div>
                )}
              </div>

              {file && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3 text-[13px]">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="reset-db"
                      checked={resetBeforeImport}
                      onCheckedChange={(c) => setResetBeforeImport(!!c)}
                    />
                    <label htmlFor="reset-db" className="text-slate-700 cursor-pointer select-none">
                      Clean existing customer directory before importing
                    </label>
                  </div>
                  {resetBeforeImport && (
                    <Badge variant="warning" className="text-xs">
                      Replace All
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-[13px] text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5 stroke-[1.75]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Result Summary */}
          {result && (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-[14px]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[1.75]" />
                  <span>Import Completed Successfully</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-white p-3 rounded-lg border border-emerald-200/60">
                    <span className="text-xs text-slate-500 block">Total Rows</span>
                    <span className="text-[18px] font-bold font-heading text-slate-900 tabular-nums">
                      {result.totalRows}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-200/60">
                    <span className="text-xs text-emerald-700 block">New Records</span>
                    <span className="text-[18px] font-bold font-heading text-emerald-600 tabular-nums">
                      +{result.inserted}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-200/60">
                    <span className="text-xs text-blue-700 block">Updated</span>
                    <span className="text-[18px] font-bold font-heading text-blue-600 tabular-nums">
                      {result.updated}
                    </span>
                  </div>
                </div>
              </div>

              {result.errorCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-800">
                  <p className="font-semibold mb-1">
                    Notes ({result.errorCount} rows skipped):
                  </p>
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

        <DialogFooter className="pt-4 border-t border-slate-100">
          <Button
            variant="secondary"
            onClick={result ? handleReset : onClose}
            disabled={isUploading}
          >
            {result ? 'Upload Another' : 'Cancel'}
          </Button>

          {!result ? (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!file}
              loading={isUploading}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              Import Data
            </Button>
          ) : (
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
