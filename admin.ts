import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const configFile = path.join(DATA_DIR, 'config.json');
const requestLogFile = path.join(DATA_DIR, 'requests.json');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(configFile, 'utf-8')); }
  catch { return { adminUser: 'admin', adminPass: 'animapi2025', bannedIPs: [], adminKey: 'animapi-admin-secret' }; }
}
function saveConfig(cfg: any) { fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2)); }
function isIPBanned(ip: string): boolean { return (loadConfig().bannedIPs || []).includes(ip); }
function isAdmin(req: any): boolean { return req.cookies?.adminAuth === loadConfig().adminKey; }

const adminRouter = express.Router();

// Login page
adminRouter.get('/login', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Login Admin</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#06060f;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:system-ui}.login-box{background:#0a0a1a;border:1px solid #2a2a4a;border-radius:16px;padding:40px;width:380px;text-align:center}.login-box h1{font-size:2em;background:linear-gradient(90deg,#e94560,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:20px}input{width:100%;padding:12px;margin-bottom:12px;border:1px solid #2a2a4a;border-radius:8px;background:#0a0a15;color:#e0e0e0}input:focus{outline:none;border-color:#a855f7}button{width:100%;padding:12px;background:#a855f7;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer}button:hover{background:#9333ea}.error{color:#ef4444;margin-bottom:10px}</style></head><body><div class="login-box"><h1>🛡️ Admin</h1>${req.query.error ? '<div class="error">' + req.query.error + '</div>' : ''}<form action="/admin/login" method="POST"><input name="username" placeholder="Username" required><input name="password" type="password" placeholder="Password" required><button>Login</button></form></div></body></html>`);
});

// Login handler
adminRouter.post('/login', (req, res) => {
  const { username, password } = req.body;
  const config = loadConfig();
  if (username === config.adminUser && password === config.adminPass) {
    res.cookie('adminAuth', config.adminKey, { maxAge: 86400000, httpOnly: true });
    return res.redirect('/admin');
  }
  res.redirect('/admin/login?error=Username+atau+password+salah');
});

// Dashboard
adminRouter.get('/', (req, res) => {
  if (!isAdmin(req)) return res.redirect('/admin/login');
  const ip = req.ip || req.socket.remoteAddress || '';
  const config = loadConfig();
  let logs = [];
  try { logs = JSON.parse(fs.readFileSync(requestLogFile, 'utf-8')); } catch {}
  const totalRequests = logs.length;
  const uniqueIPs = [...new Set(logs.map((l: any) => l.ip))].length;
  const lastRequests = logs.slice(-20).reverse();
  const bannedIPs = config.bannedIPs || [];

  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admin Dashboard</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#06060f;color:#d0d0d0;font-family:system-ui;padding:20px}.header{background:linear-gradient(135deg,#1a0033,#0d0d2b);padding:25px;border-radius:14px;margin-bottom:20px;border:1px solid #2a2a4a;display:flex;justify-content:space-between;align-items:center}.header h1{font-size:1.6em;background:linear-gradient(90deg,#e94560,#a855f7,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.logout{color:#ef4444;text-decoration:none;font-weight:600}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px}.card{background:#0d0d22;border:1px solid #2a2a4a;border-radius:12px;padding:20px;text-align:center}.card .number{font-size:2.2em;font-weight:700;color:#a855f7}.card .label{color:#666;font-size:.8em;margin-top:4px}.section{background:#0d0d22;border:1px solid #2a2a4a;border-radius:12px;padding:20px;margin-bottom:20px}.section h2{color:#a855f7;font-size:1em;margin-bottom:12px}table{width:100%;border-collapse:collapse;font-size:.82em}th,td{padding:10px;text-align:left;border-bottom:1px solid #1a1a3a}th{color:#777}.btn{padding:7px 14px;border:none;border-radius:7px;cursor:pointer;font-weight:600;font-size:.82em;text-decoration:none}.btn-danger{background:#ef4444;color:#fff}.btn-success{background:#22c55e;color:#fff}.btn:hover{opacity:.8}.ip-tag{display:inline-flex;align-items:center;gap:8px;background:#1a1a3a;padding:4px 12px;border-radius:15px;font-size:.78em;margin:3px}.ip-tag a{color:#22c55e;text-decoration:none;font-weight:700}form{display:flex;gap:8px;margin-top:10px}input{flex:1;padding:10px;border:1px solid #2a2a4a;border-radius:8px;background:#0a0a15;color:#e0e0e0}</style></head><body><div class="header"><div><h1>🛡️ AnimAPI Admin</h1><span style="color:#666;font-size:.8em;">IP: ${ip}</span></div><a href="/admin/logout" class="logout">🚪 Logout</a></div><div class="grid"><div class="card"><div class="number">${totalRequests}</div><div class="label">Total Requests</div></div><div class="card"><div class="number">${uniqueIPs}</div><div class="label">Unique IPs</div></div><div class="card"><div class="number">${bannedIPs.length}</div><div class="label">Banned</div></div></div><div class="section"><h2>📝 Request Terakhir</h2><table><tr><th>Method</th><th>Path</th><th>IP</th><th>Time</th></tr>${lastRequests.map((r: any) => `<tr><td>${r.method}</td><td>${(r.path||'').substring(0,50)}</td><td>${r.ip}</td><td>${(r.time||'').substring(11,19)}</td></tr>`).join('')}</table></div><div class="section"><h2>🚫 Banned IPs</h2>${bannedIPs.length === 0 ? '<span style="color:#666">Tidak ada</span>' : bannedIPs.map((ip: string) => `<span class="ip-tag">🚫 ${ip} <a href="/admin/unban?ip=${ip}">✕</a></span>`).join('')}<form action="/admin/ban"><input name="ip" placeholder="IP address..."><button class="btn btn-danger">Ban</button></form></div><div style="text-align:center;color:#444;margin-top:20px;">AnimAPI v4.0 | <a href="/">Home</a></div></body></html>`);
});

// Logout
adminRouter.get('/logout', (req, res) => { res.clearCookie('adminAuth'); res.redirect('/admin/login'); });

// Ban IP
adminRouter.get('/ban', (req, res) => {
  if (!isAdmin(req)) return res.redirect('/admin/login');
  const ip = (req.query.ip || '').trim();
  if (ip) { const cfg = loadConfig(); if (!cfg.bannedIPs.includes(ip)) { cfg.bannedIPs.push(ip); saveConfig(cfg); } }
  res.redirect('/admin');
});

// Unban IP
adminRouter.get('/unban', (req, res) => {
  if (!isAdmin(req)) return res.redirect('/admin/login');
  const ip = (req.query.ip || '').trim();
  if (ip) { const cfg = loadConfig(); cfg.bannedIPs = cfg.bannedIPs.filter((i: string) => i !== ip); saveConfig(cfg); }
  res.redirect('/admin');
});

export default adminRouter;
