const fs = require('fs');
const file = '/Users/macbookpro/Documents/gms-app/app/dashboard/burials/new/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Move Input and Select out
content = content.replace(
`  const Input = ({ name, label, type = 'text', required = false, placeholder = '' }: any) => (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}{required && <span className="text-red-400">*</span>}</label>
      <input type={type} name={name} value={(form as any)[name]} onChange={h} required={required} placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition" />
    </div>
  );
  const Select = ({ name, label, options, required = false }: any) => (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}{required && <span className="text-red-400">*</span>}</label>
      <select name={name} value={(form as any)[name]} onChange={h} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition">
        {options.map(([v, l]: string[]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );`,
  ''
);

const newComponents = `
const Input = ({ name, label, type = 'text', required = false, placeholder = '', form, onChange }: any) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">{label}{required && <span className="text-red-400">*</span>}</label>
    <input type={type} name={name} value={form[name]} onChange={onChange} required={required} placeholder={placeholder}
      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition" />
  </div>
);

const Select = ({ name, label, options, required = false, form, onChange }: any) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">{label}{required && <span className="text-red-400">*</span>}</label>
    <select name={name} value={form[name]} onChange={onChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition">
      {options.map(([v, l]: string[]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </div>
);
`;

content = content.replace(
  'export default function NewBurialPage() {',
  newComponents + '\nexport default function NewBurialPage() {'
);

// Add form={form} onChange={h} to all <Input and <Select calls
content = content.replace(/<Input /g, '<Input form={form} onChange={h} ');
content = content.replace(/<Select /g, '<Select form={form} onChange={h} ');

fs.writeFileSync(file, content);
console.log('Fixed app/dashboard/burials/new/page.tsx');
