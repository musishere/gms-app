// Shared deceased / next-of-kin form fields used by booking and burial flows.

export interface DeceasedFormData {
  deceasedName: string;
  deceasedCNIC: string;
  dateOfBirth: string;
  dateOfDeath: string;
  causeOfDeath: string;
  religion: string;
  nationality: string;
  address: string;
  nextOfKin: string;
  nextOfKinPhone: string;
  nextOfKinCNIC: string;
  relationship: string;
}

export const DEFAULT_DECEASED_FORM: DeceasedFormData = {
  deceasedName: '',
  deceasedCNIC: '',
  dateOfBirth: '',
  dateOfDeath: '',
  causeOfDeath: '',
  religion: 'Islam',
  nationality: 'Pakistani',
  address: '',
  nextOfKin: '',
  nextOfKinPhone: '',
  nextOfKinCNIC: '',
  relationship: '',
};

export function deceasedFormToApi(form: DeceasedFormData) {
  return {
    name: form.deceasedName,
    cnic: form.deceasedCNIC || undefined,
    dateOfBirth: form.dateOfBirth || undefined,
    dateOfDeath: form.dateOfDeath,
    causeOfDeath: form.causeOfDeath || undefined,
    religion: form.religion || undefined,
    nationality: form.nationality || undefined,
    address: form.address || undefined,
    nextOfKin: form.nextOfKin,
    nextOfKinPhone: form.nextOfKinPhone,
    nextOfKinCNIC: form.nextOfKinCNIC || undefined,
    relationship: form.relationship || undefined,
  };
}

export function deceasedApiToForm(deceased?: Record<string, string | undefined> | null): Partial<DeceasedFormData> {
  if (!deceased) return {};
  return {
    deceasedName: deceased.name || '',
    deceasedCNIC: deceased.cnic || '',
    dateOfBirth: deceased.dateOfBirth || '',
    dateOfDeath: deceased.dateOfDeath || '',
    causeOfDeath: deceased.causeOfDeath || '',
    religion: deceased.religion || 'Islam',
    nationality: deceased.nationality || 'Pakistani',
    address: deceased.address || '',
    nextOfKin: deceased.nextOfKin || '',
    nextOfKinPhone: deceased.nextOfKinPhone || '',
    nextOfKinCNIC: deceased.nextOfKinCNIC || '',
    relationship: deceased.relationship || '',
  };
}

export function bookingToDeceasedForm(booking: {
  deceasedName?: string;
  contactName?: string;
  contactPhone?: string;
  deceasedCnic?: string;
  dateOfDeath?: string;
  causeOfDeath?: string;
  address?: string;
  deceased?: Record<string, string | undefined> | null;
}): Partial<DeceasedFormData> {
  const fromJson = deceasedApiToForm(booking.deceased);
  return {
    deceasedName: fromJson.deceasedName || booking.deceasedName || '',
    nextOfKin: fromJson.nextOfKin || booking.contactName || '',
    nextOfKinPhone: fromJson.nextOfKinPhone || booking.contactPhone || '',
    deceasedCNIC: fromJson.deceasedCNIC || booking.deceasedCnic || '',
    dateOfBirth: fromJson.dateOfBirth || '',
    dateOfDeath: fromJson.dateOfDeath || booking.dateOfDeath || '',
    causeOfDeath: fromJson.causeOfDeath || booking.causeOfDeath || '',
    religion: fromJson.religion || 'Islam',
    nationality: fromJson.nationality || 'Pakistani',
    address: fromJson.address || booking.address || '',
    nextOfKinCNIC: fromJson.nextOfKinCNIC || '',
    relationship: fromJson.relationship || '',
  };
}

export function getDeceasedValidationErrors(
  form: Partial<DeceasedFormData>,
): string[] {
  const missing: string[] = [];
  if (!String(form.deceasedName ?? '').trim()) missing.push('Full Name');
  if (!String(form.dateOfDeath ?? '').trim()) missing.push('Date of Death');
  if (!String(form.nextOfKin ?? '').trim()) missing.push('Next of Kin Name');
  if (!String(form.nextOfKinPhone ?? '').trim()) missing.push('Phone Number');
  return missing;
}

export function isDeceasedFormValid(
  form: Partial<DeceasedFormData>,
): boolean {
  return getDeceasedValidationErrors(form).length === 0;
}
