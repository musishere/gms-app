import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
  options?: [string, string][];
  rows?: number;
}

export default function FormField({
  label, name, type = 'text', value, onChange, required, placeholder, hint, error, options, rows,
}: FormFieldProps) {
  const inputCls = cn(
    'w-full bg-slate-800 border rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition',
    error ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700 focus:border-emerald-500',
  );

  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">
        {label}{required && <span className="text-red-400"> *</span>}
      </label>
      {options ? (
        <select name={name} value={value} onChange={onChange} className={cn(inputCls, 'text-slate-300')}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : rows ? (
        <textarea name={name} value={value} onChange={onChange} rows={rows} placeholder={placeholder} className={cn(inputCls, 'resize-none')} />
      ) : (
        <input type={type} name={name} value={value} onChange={onChange} required={required} placeholder={placeholder} className={inputCls} />
      )}
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
