import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'config.json');

// Initialize DB file if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}));
}

export const getConfig = (key: string) => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const json = JSON.parse(data);
    return json[key] || null;
  } catch (error) {
    console.error('Error reading config:', error);
    return null;
  }
};

export const saveConfig = (key: string, value: any) => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const json = JSON.parse(data);
    json[key] = value;
    fs.writeFileSync(DB_FILE, JSON.stringify(json, null, 2));
  } catch (error) {
    console.error('Error saving config:', error);
  }
};
