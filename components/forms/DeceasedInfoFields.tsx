'use client';

import type { DeceasedFormData } from '@/lib/deceased-form';

const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition';

const labelCls = 'block text-xs font-medium text-slate-400 mb-1';

function Input({
  name,
  label,
  type = 'text',
  required = false,
  placeholder = '',
  hint,
  form,
  onChange,
}: {
  name: keyof DeceasedFormData;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  form: DeceasedFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={inputCls}
      />
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function Select({
  name,
  label,
  options,
  required = false,
  form,
  onChange,
}: {
  name: keyof DeceasedFormData;
  label: string;
  options: [string, string][];
  required?: boolean;
  form: DeceasedFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <select
        name={name}
        value={form[name]}
        onChange={onChange}
        className={inputCls + ' text-slate-300'}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function DeceasedInfoFields({
  form,
  onChange,
}: {
  form: DeceasedFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-200">Deceased Person Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input form={form} onChange={onChange} name="deceasedName" label="Full Name" required />
        <Input
          form={form}
          onChange={onChange}
          name="deceasedCNIC"
          label="CNIC (if available)"
          placeholder="00000-0000000-0"
          hint="Format: XXXXX-XXXXXXX-X"
        />
        <Input form={form} onChange={onChange} name="dateOfBirth" label="Date of Birth" type="date" />
        <Input form={form} onChange={onChange} name="dateOfDeath" label="Date of Death" type="date" required />
        <Input form={form} onChange={onChange} name="causeOfDeath" label="Cause of Death" />
        <Select
          form={form}
          onChange={onChange}
          name="religion"
          label="Religion"
          options={[
            ['Islam', 'Islam'],
            ['Christianity', 'Christianity'],
            ['Hinduism', 'Hinduism'],
            ['Other', 'Other'],
          ]}
        />
        <Input form={form} onChange={onChange} name="nationality" label="Nationality" />
        <Input form={form} onChange={onChange} name="address" label="Home Address" />
      </div>

      <hr className="border-slate-700 my-4" />

      <h3 className="text-sm font-semibold text-slate-200">Next of Kin Details</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input form={form} onChange={onChange} name="nextOfKin" label="Next of Kin Name" required />
        <Input
          form={form}
          onChange={onChange}
          name="nextOfKinPhone"
          label="Phone Number"
          required
          placeholder="+92 300 0000000"
        />
        <Input
          form={form}
          onChange={onChange}
          name="nextOfKinCNIC"
          label="CNIC"
          placeholder="00000-0000000-0"
        />
        <Input
          form={form}
          onChange={onChange}
          name="relationship"
          label="Relationship to Deceased"
          placeholder="Son, Daughter, Spouse…"
        />
      </div>
    </div>
  );
}
