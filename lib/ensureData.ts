import fs from 'fs';
import path from 'path';

export function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const dbFile = path.join(dir, 'db.json');
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({ users: [], graves: [], burials: [], payments: [], certificates: [], maintenance: [], notifications: [] }, null, 2));
  }
}
