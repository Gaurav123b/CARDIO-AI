import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { predictRisk } from '../services/api';
import { Loader2, AlertTriangle, ShieldCheck, Activity, Upload } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const INITIAL_STATE = {
  age: '', sex: 'Male', cholesterol_total: '', hdl: '', ldl: '', triglycerides: ''
};

const SAMPLE_DATA_HIGH_RISK = {
  age: 65, sex: 'Male', cholesterol_total: 240, hdl: 35, ldl: 160, triglycerides: 200
};

const SAMPLE_DATA_LOW_RISK = {
  age: 32, sex: 'Female', cholesterol_total: 165, hdl: 65, ldl: 90, triglycerides: 100
};

const parseReportValues = (text) => {
  const values = {};
  const normalized = text.toLowerCase();

  const extractNumber = (patterns) => {
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        const raw = match[1] || match[0];
        const numeric = Number(String(raw).replace(/[^0-9.]/g, ''));
        if (Number.isFinite(numeric)) return numeric;
      }
    }
    return null;
  };

  if (normalized.includes('male')) values.sex = 'Male';
  if (normalized.includes('female')) values.sex = 'Female';

  values.age = extractNumber([
    /\bage\s*[:=]\s*(\d{1,3})/,
    /\bage\s+(\d{1,3})\b/,
  ]);

  values.cholesterol_total = extractNumber([
    /(?:total cholesterol|cholesterol total)\s*(?:[:=]\s*|\s+)(\d{2,4})\b/,
    /\bchol\s*(?:[:=]\s*|\s+)(\d{2,4})\b/,
  ]);

  values.hdl = extractNumber([
    /\bhdl(?: cholesterol)?\s*(?:[:=]\s*|\s+)(\d{1,3})\b/,
    /high[- ]density lipoprotein\s*(?:[:=]\s*|\s+)(\d{1,3})\b/,
  ]);

  values.ldl = extractNumber([
    /\bldl(?: cholesterol)?\s*(?:[:=]\s*|\s+)(\d{1,3})\b/,
    /low[- ]density lipoprotein\s*(?:[:=]\s*|\s+)(\d{1,3})\b/,
  ]);

  values.triglycerides = extractNumber([
    /\btriglycerides?\s*(?:[:=]\s*|\s+)(\d{1,4})\b/,
    /\btg\s*(?:[:=]\s*|\s+)(\d{1,4})\b/,
  ]);

  return values;
};

const Predict = () => {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSampleData = (type) => {
    setFormData(type === 'high' ? SAMPLE_DATA_HIGH_RISK : SAMPLE_DATA_LOW_RISK);
    setResult(null);
    setError(null);
  };

  const handleReportUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingReport(true);
    setUploadStatus('Reading PDF report...');
    setError(null);
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

      const fileBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: fileBuffer }).promise;
      let extractedText = '';

      for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
        const page = await pdf.getPage(pageIndex);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(' ');
        extractedText += `${pageText} `;
      }

      let parsed = parseReportValues(extractedText);
      const lipidFields = ['cholesterol_total', 'hdl', 'ldl', 'triglycerides'];
      const textFieldCount = lipidFields.filter((field) => parsed[field] !== null).length;

      if (textFieldCount < 3) {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng', 1, {
          logger: ({ status, progress }) => {
            if (status === 'recognizing text') {
              setUploadStatus(`Reading scanned report: ${Math.round(progress * 100)}%`);
            }
          },
        });
        try {
          await worker.setParameters({
            tessedit_pageseg_mode: '6',
            preserve_interword_spaces: '1',
          });
          let ocrText = '';
          for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
            const page = await pdf.getPage(pageIndex);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d');
            if (!context) continue;
            await page.render({ canvasContext: context, viewport }).promise;
            const { data } = await worker.recognize(canvas);
            ocrText += `${data.text} `;
          }
          const ocrValues = parseReportValues(ocrText);
          parsed = Object.fromEntries(
            Object.entries(parsed).map(([key, value]) => [key, value ?? ocrValues[key]])
          );
        } finally {
          await worker.terminate();
        }
      }

      const populated = Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => value !== null && value !== undefined)
      );

      if (Object.keys(populated).length === 0) {
        throw new Error('No readable lab values found in the uploaded PDF. Please enter values manually.');
      }

      setFormData((prev) => ({ ...prev, ...populated }));
      setResult(null);
      setError(null);
      setUploadStatus('Report values imported. Review them before analysis.');
    } catch (err) {
      setError(err.message || 'Unable to read the uploaded report PDF.');
      setUploadStatus(null);
    } finally {
      setUploadingReport(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const payload = { ...formData };
      Object.keys(payload).forEach(key => {
        if (!['sex', 'chest_pain_type', 'smoker_status'].includes(key)) {
          payload[key] = Number(payload[key]);
        }
      });
      const data = await predictRisk(payload);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, name, type = 'number', step = 'any') => (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-400">{label}</label>
      <input type={type} name={name} value={formData[name]} onChange={handleChange} step={step} required className="glass-input" />
    </div>
  );

  const renderSelect = (label, name, options) => (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-400">{label}</label>
      <select name={name} value={formData[name]} onChange={handleChange} required className="glass-input appearance-none">
        {options.map(opt => <option key={opt.value} value={opt.value} className="bg-navy-900">{opt.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Analyze Your <span className="text-gradient">Lipid Profile</span></h1>
        <p className="text-slate-400 max-w-2xl mx-auto">Enter comprehensive patient data to evaluate cardiovascular risk using our trained ML model.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 glass-panel p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold text-white">Cardio Risk Inputs</h2>
              <p className="text-sm text-slate-400">Only age, sex, and lipid values are used for prediction.</p>
            </div>
            <label aria-busy={uploadingReport} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20">
              <Upload className="h-4 w-4" />
              {uploadingReport ? uploadStatus : 'Upload report PDF'}
              <input type="file" accept="application/pdf" onChange={handleReportUpload} disabled={uploadingReport} className="hidden" />
            </label>
          </div>
          {uploadStatus && !uploadingReport && <p role="status" className="mb-5 text-sm text-cyan-300">{uploadStatus}</p>}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {renderInput('Age', 'age')}
              {renderSelect('Sex', 'sex', [{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}])}
              {renderInput('Cholesterol Total', 'cholesterol_total')}
              {renderInput('HDL', 'hdl')}
              {renderInput('LDL', 'ldl')}
              {renderInput('Triglycerides', 'triglycerides')}
            </div>

            <div className="flex flex-wrap gap-4 justify-center items-center pt-6 border-t border-white/10">
              <button type="button" onClick={() => handleSampleData('low')} className="text-sm px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-slate-300">
                Load Low Risk Sample
              </button>
              <button type="button" onClick={() => handleSampleData('high')} className="text-sm px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-slate-300">
                Load High Risk Sample
              </button>
              <button type="submit" disabled={loading} className="bg-cyan-500 hover:bg-cyan-400 text-navy-900 px-8 py-3 rounded-xl font-bold transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {loading && <Loader2 className="animate-spin w-5 h-5" />}
                {loading ? 'Analyzing...' : 'RUN AI ANALYSIS'}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Results Panel */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-8 rounded-3xl sticky top-28 h-full flex flex-col justify-center min-h-[400px]">
            <AnimatePresence mode="wait">
              {!result && !loading && !error && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-slate-500">
                  <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Awaiting patient data...</p>
                </motion.div>
              )}

              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-6">
                    <svg className="animate-spin w-full h-full text-cyan-500/20" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="text-cyan-400 font-medium animate-pulse">Running ML Model...</p>
                </motion.div>
              )}

              {error && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-red-400">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                  <p>{error}</p>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center flex flex-col items-center">
                  <h3 className="text-sm font-bold text-slate-400 tracking-widest uppercase mb-6">Model Prediction</h3>
                  
                  {/* Circular Progress Indicator for Probability */}
                  <div className="relative w-48 h-48 mb-8">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                      <motion.circle 
                        cx="50" cy="50" r="45" fill="none" 
                        stroke={result.prediction === 1 ? '#ef4444' : '#10b981'} 
                        strokeWidth="8" strokeLinecap="round"
                        initial={{ strokeDasharray: '283', strokeDashoffset: '283' }}
                        animate={{ strokeDashoffset: 283 - (283 * result.probability) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold">{(result.probability * 100).toFixed(1)}<span className="text-xl">%</span></span>
                      <span className="text-xs text-slate-400 mt-1">Probability</span>
                    </div>
                  </div>

                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${result.prediction === 1 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                    {result.prediction === 1 ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    <span className="font-bold text-lg">{result.risk_level}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Predict;
