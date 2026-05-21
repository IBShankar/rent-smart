const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let configPath;

function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Config read error:', e.message);
  }
  return {};
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.error('Config save error:', e.message);
  }
}

async function getClaudeClient() {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error('API key not configured. Please open Settings and add your Claude API key.');
  }
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  return new Anthropic({ apiKey: config.apiKey });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 920,
    minHeight: 660,
    frame: false,
    backgroundColor: '#f7f3ec',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  configPath = path.join(app.getPath('userData'), 'rent-smart-config.json');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── Window Controls ───────────────────────────────────────────────────────────
ipcMain.handle('window-minimize', () => mainWindow.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.handle('window-close', () => mainWindow.close());

// ─── API Key ───────────────────────────────────────────────────────────────────
ipcMain.handle('has-api-key', () => !!getConfig().apiKey);

ipcMain.handle('save-api-key', (_, key) => {
  if (!key || typeof key !== 'string' || key.trim().length < 20) {
    throw new Error('Please enter a valid API key (starts with sk-ant-).');
  }
  const config = getConfig();
  config.apiKey = key.trim();
  saveConfig(config);
  return true;
});

// ─── Claude: Relocation Advisor ────────────────────────────────────────────────
ipcMain.handle('claude-relocation', async (_, { city, budget, lifestyle }) => {
  const client = await getClaudeClient();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are an expert relocation advisor. Recommend exactly 3 real, specific neighbourhoods.

City/Area: ${city}
Monthly Budget: ${budget}
Lifestyle preferences: ${lifestyle.join(', ')}

Respond with ONLY valid JSON — no markdown, no prose:
{
  "neighbourhoods": [
    {
      "name": "Neighbourhood Name",
      "city": "City, Country",
      "match_reason": "2-3 sentences explaining why this matches their preferences and budget",
      "rent_range": "Typical monthly rent range for a 1-bed flat here",
      "advantage": "The single best thing about living here",
      "watch_out": "One honest thing to be aware of"
    }
  ]
}`
    }],
  });

  const text = message.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Unexpected response format from Claude. Please try again.');
  return JSON.parse(match[0]);
});

// ─── Claude: Neighbourhood Decoder ────────────────────────────────────────────
ipcMain.handle('claude-neighbourhood', async (_, { area }) => {
  const client = await getClaudeClient();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `You are an expert urban analyst. Evaluate this neighbourhood for potential renters: "${area}"

Score guide: 1-3 = Poor  4-5 = Below average  6-7 = Good  8-9 = Excellent  10 = Outstanding

Respond with ONLY valid JSON — no markdown, no prose:
{
  "area_name": "Full area name with city and country",
  "overview": "2 honest sentences about renting in this area",
  "scores": {
    "safety": { "score": 7, "note": "Factual note about safety and crime in this area" },
    "affordability": { "score": 8, "note": "Note about rental costs relative to local market" },
    "transport": { "score": 9, "note": "Note about public transport, walkability, connectivity" },
    "lifestyle": { "score": 7, "note": "Note about restaurants, culture, entertainment, parks" },
    "family": { "score": 6, "note": "Note about schools, child-friendliness, community feel" }
  }
}`
    }],
  });

  const text = message.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Unexpected response format from Claude. Please try again.');
  return JSON.parse(match[0]);
});

// ─── Claude: Lease Clause Explainer ───────────────────────────────────────────
ipcMain.handle('claude-lease', async (_, { clause }) => {
  const client = await getClaudeClient();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1400,
    messages: [{
      role: 'user',
      content: `You are a tenant rights expert. Analyse this lease clause from the tenant's perspective:

"${clause}"

Respond with ONLY valid JSON — no markdown, no prose:
{
  "plain_english": "Clear 2-3 sentence explanation in everyday language of what this means for the tenant",
  "red_flags": [
    {
      "flag": "Short name for this concern",
      "severity": "high",
      "explanation": "Why this is concerning and what it means practically for the tenant"
    }
  ],
  "risk_rating": "LOW",
  "tenant_advice": "Practical advice: what should the tenant do or try to negotiate?"
}

Rules: severity = exactly "high", "medium", or "low". risk_rating = exactly "LOW", "MEDIUM", or "HIGH". If no red flags, use []. Be honest but not alarmist.`
    }],
  });

  const text = message.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Unexpected response format from Claude. Please try again.');
  return JSON.parse(match[0]);
});
