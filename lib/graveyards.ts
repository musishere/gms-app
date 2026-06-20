export interface City {
  id: string;
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface Graveyard {
  id: string;
  name: string;
  address: string;
  area: string;
  cityId: string;
  city: string;
  latitude: number;
  longitude: number;
  description?: string;
}

export const PAKISTAN_CITIES: City[] = [
  { id: 'lahore',     name: 'Lahore',     province: 'Punjab',   latitude: 31.5204, longitude: 74.3587, zoom: 11 },
  { id: 'karachi',    name: 'Karachi',    province: 'Sindh',    latitude: 24.8607, longitude: 67.0011, zoom: 11 },
  { id: 'islamabad',  name: 'Islamabad',  province: 'ICT',      latitude: 33.6844, longitude: 73.0479, zoom: 11 },
  { id: 'rawalpindi', name: 'Rawalpindi', province: 'Punjab',   latitude: 33.5651, longitude: 73.0169, zoom: 11 },
  { id: 'faisalabad', name: 'Faisalabad', province: 'Punjab',   latitude: 31.4504, longitude: 73.1350, zoom: 11 },
];

export const GRAVEYARDS: Graveyard[] = [
  // ── Lahore ──────────────────────────────────────────────────────────────────
  {
    id: 'uol-main',
    name: 'UOL Campus Graveyard',
    address: 'University of Lahore, Defence Road',
    area: 'Raiwind Road',
    cityId: 'lahore',
    city: 'Lahore',
    latitude: 31.5204,
    longitude: 74.3587,
    description: 'Main campus graveyard — Sections A–D & VIP',
  },
  {
    id: 'bahria-lahore',
    name: 'Bahria Town Graveyard',
    address: 'Bahria Town, Raiwind Road',
    area: 'Bahria Town',
    cityId: 'lahore',
    city: 'Lahore',
    latitude: 31.3702,
    longitude: 74.1956,
    description: 'Community graveyard serving Bahria Town residents',
  },
  {
    id: 'thokar',
    name: 'Thokar Niaz Baig Cemetery',
    address: 'Thokar Niaz Baig, Multan Road',
    area: 'Thokar Niaz Baig',
    cityId: 'lahore',
    city: 'Lahore',
    latitude: 31.4028,
    longitude: 74.2272,
    description: 'Cemetery near Multan Road interchange',
  },
  {
    id: 'dha-lahore',
    name: 'DHA Graveyard Lahore',
    address: 'DHA Phase 5, Lahore Cantt',
    area: 'DHA Lahore',
    cityId: 'lahore',
    city: 'Lahore',
    latitude: 31.4816,
    longitude: 74.3974,
    description: 'DHA residential community cemetery',
  },
  {
    id: 'johar-town',
    name: 'Johar Town Cemetery',
    address: 'Johar Town, Block J',
    area: 'Johar Town',
    cityId: 'lahore',
    city: 'Lahore',
    latitude: 31.4697,
    longitude: 74.2728,
    description: 'Community burial ground in Johar Town',
  },
  {
    id: 'miani-sahib',
    name: 'Miani Sahib Graveyard',
    address: 'Miani Sahib Road, Mozang',
    area: 'Mozang',
    cityId: 'lahore',
    city: 'Lahore',
    latitude: 31.5497,
    longitude: 74.3436,
    description: 'Historic city cemetery',
  },
  {
    id: 'ravi-road',
    name: 'Ravi Road Graveyard',
    address: 'Ravi Road, Shahdara',
    area: 'Shahdara',
    cityId: 'lahore',
    city: 'Lahore',
    latitude: 31.5820,
    longitude: 74.3650,
    description: 'Riverside burial grounds',
  },
  {
    id: 'wahdat-road',
    name: 'Wahdat Road Cemetery',
    address: 'Wahdat Road, Garden Town',
    area: 'Garden Town',
    cityId: 'lahore',
    city: 'Lahore',
    latitude: 31.4780,
    longitude: 74.3180,
    description: 'Southern Lahore cemetery',
  },
  {
    id: 'shalimar',
    name: 'Shalimar Gardens Cemetery',
    address: 'Shalimar Link Road',
    area: 'Baghbanpura',
    cityId: 'lahore',
    city: 'Lahore',
    latitude: 31.5870,
    longitude: 74.3820,
    description: 'Near Shalimar Gardens',
  },
  // ── Karachi ─────────────────────────────────────────────────────────────────
  {
    id: 'mewa-shah',
    name: 'Mewa Shah Graveyard',
    address: 'Mewa Shah Road, Old City',
    area: 'Old City',
    cityId: 'karachi',
    city: 'Karachi',
    latitude: 24.8607,
    longitude: 67.0011,
    description: 'Historic graveyard in old Karachi',
  },
  {
    id: 'paposh-nagar',
    name: 'Paposh Nagar Cemetery',
    address: 'Paposh Nagar, North Nazimabad',
    area: 'North Nazimabad',
    cityId: 'karachi',
    city: 'Karachi',
    latitude: 24.9254,
    longitude: 67.0503,
    description: 'Cemetery in North Nazimabad',
  },
  {
    id: 'dha-karachi',
    name: 'DHA Graveyard Karachi',
    address: 'DHA Phase 6, Karachi',
    area: 'DHA Karachi',
    cityId: 'karachi',
    city: 'Karachi',
    latitude: 24.8101,
    longitude: 67.0726,
    description: 'DHA community cemetery',
  },
  // ── Islamabad ───────────────────────────────────────────────────────────────
  {
    id: 'h8-islamabad',
    name: 'H-8 Islamabad Graveyard',
    address: 'H-8 Sector, Islamabad',
    area: 'H-8',
    cityId: 'islamabad',
    city: 'Islamabad',
    latitude: 33.6750,
    longitude: 73.0590,
    description: 'Main Islamabad capital territory graveyard',
  },
  {
    id: 'bahria-islamabad',
    name: 'Bahria Town Islamabad Graveyard',
    address: 'Bahria Town Phase 7, Islamabad',
    area: 'Bahria Town Islamabad',
    cityId: 'islamabad',
    city: 'Islamabad',
    latitude: 33.5326,
    longitude: 73.1045,
    description: 'Community graveyard in Bahria Town Islamabad',
  },
  // ── Rawalpindi ──────────────────────────────────────────────────────────────
  {
    id: 'lalkurti',
    name: 'Lalkurti Graveyard',
    address: 'Lalkurti, Rawalpindi Cantt',
    area: 'Cantt',
    cityId: 'rawalpindi',
    city: 'Rawalpindi',
    latitude: 33.5952,
    longitude: 73.0618,
    description: 'Cantonment area cemetery',
  },
  {
    id: 'dhoke-kala-khan',
    name: 'Dhoke Kala Khan Cemetery',
    address: 'Dhoke Kala Khan, Rawalpindi',
    area: 'Dhoke Kala Khan',
    cityId: 'rawalpindi',
    city: 'Rawalpindi',
    latitude: 33.5780,
    longitude: 73.0410,
    description: 'Community burial ground in Rawalpindi',
  },
  // ── Faisalabad ──────────────────────────────────────────────────────────────
  {
    id: 'gulberg-fsd',
    name: 'Gulberg Graveyard',
    address: 'Gulberg Colony, Faisalabad',
    area: 'Gulberg',
    cityId: 'faisalabad',
    city: 'Faisalabad',
    latitude: 31.4504,
    longitude: 73.1350,
    description: 'Community cemetery in Gulberg area',
  },
];

/** Graveyards grouped by city id */
export function getGraveyardsByCity(cityId: string): Graveyard[] {
  return GRAVEYARDS.filter(g => g.cityId === cityId);
}

export function getCity(id: string | null | undefined): City | undefined {
  return PAKISTAN_CITIES.find(c => c.id === id);
}

export function getGraveyard(id: string | null | undefined): Graveyard | undefined {
  return GRAVEYARDS.find(g => g.id === id);
}

export function getGraveyardOrDefault(id: string | null | undefined): Graveyard {
  return getGraveyard(id) ?? GRAVEYARDS[0];
}

/** Backward-compat alias */
export const LAHORE_GRAVEYARDS = GRAVEYARDS.filter(g => g.cityId === 'lahore');
