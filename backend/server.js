/**
 * iAddress Pro — Backend Server v3
 * Auto-seeds 15 Indian contacts on first login!
 */

const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const cors      = require('cors');
const Datastore = require('nedb-promises');
const path      = require('path');
const fs        = require('fs');

const app        = express();
const PORT       = 3001;
const JWT_SECRET = 'iAddressPro_2024';

// ── DATABASE ─────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const usersDB    = Datastore.create({ filename: path.join(DATA_DIR, 'users.db'),    autoload: true });
const contactsDB = Datastore.create({ filename: path.join(DATA_DIR, 'contacts.db'), autoload: true });

usersDB.ensureIndex({ fieldName: 'email', unique: true });

app.use(cors());
app.use(express.json());

// ── AUTH MIDDLEWARE ───────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── 15 INDIAN CONTACTS ───────────────────────────
const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4','#84cc16','#a855f7'];

const INDIAN_CONTACTS = [
  { name:'Aarav Sharma',   phone:'+91 98201 11234', email:'aarav.sharma@gmail.com',     company:'Tata Consultancy Services', address:'Bandra West, Mumbai',       group:'Work',     birthday:'1995-03-15', notes:'Senior software engineer, loves cricket',  favourite:false },
  { name:'Priya Patel',    phone:'+91 99870 22345', email:'priya.patel@hotmail.com',    company:'Infosys Limited',           address:'Koramangala, Bangalore',    group:'Work',     birthday:'1997-07-22', notes:'Project manager, met at tech conference',  favourite:true  },
  { name:'Rohit Verma',    phone:'+91 97654 33456', email:'rohit.verma@yahoo.com',      company:'Wipro Technologies',        address:'Sector 62, Noida, UP',     group:'College',  birthday:'1996-11-08', notes:'Batchmate from engineering college',       favourite:false },
  { name:'Sneha Iyer',     phone:'+91 90001 44567', email:'sneha.iyer@outlook.com',     company:'HDFC Bank',                 address:'T. Nagar, Chennai',        group:'Friends',  birthday:'1998-01-30', notes:'Childhood friend, now banker',            favourite:true  },
  { name:'Arjun Mehta',    phone:'+91 88009 55678', email:'arjun.mehta@gmail.com',      company:'Reliance Industries',       address:'Nariman Point, Mumbai',    group:'Business', birthday:'1990-05-14', notes:'Business partner, deal signed last year', favourite:false },
  { name:'Kavya Nair',     phone:'+91 77008 66789', email:'kavya.nair@gmail.com',       company:'Kerala Tourism',            address:'MG Road, Kochi, Kerala',   group:'Friends',  birthday:'1999-09-25', notes:'Travel blogger, amazing cook',            favourite:true  },
  { name:'Vikram Singh',   phone:'+91 95007 77890', email:'vikram.singh@gmail.com',     company:'Indian Army',               address:'Cantonment, Pune',         group:'Family',   birthday:'1988-12-03', notes:'Uncle, retired colonel',                 favourite:false },
  { name:'Ananya Gupta',   phone:'+91 93006 88901', email:'ananya.gupta@gmail.com',     company:'Zomato India',              address:'Gurugram, Haryana',        group:'Work',     birthday:'2000-04-18', notes:'UI/UX designer, very creative',           favourite:false },
  { name:'Rajesh Kumar',   phone:'+91 91005 99012', email:'rajesh.kumar@sbi.co.in',     company:'State Bank of India',       address:'Connaught Place, Delhi',   group:'Business', birthday:'1982-08-07', notes:'Bank manager, helps with loans',          favourite:true  },
  { name:'Deepika Reddy',  phone:'+91 89004 00123', email:'deepika.reddy@gmail.com',    company:'Apollo Hospitals',          address:'Jubilee Hills, Hyderabad', group:'Friends',  birthday:'1994-02-14', notes:'Doctor, specializes in cardiology',        favourite:false },
  { name:'Suresh Pillai',  phone:'+91 86003 11234', email:'suresh.pillai@gmail.com',    company:'Cochin Shipyard',           address:'Ernakulam, Kochi',         group:'Family',   birthday:'1975-06-20', notes:'Fathers old friend, marine engineer',     favourite:false },
  { name:'Pooja Agarwal',  phone:'+91 84002 22345', email:'pooja.agarwal@gmail.com',    company:'Flipkart',                  address:'Whitefield, Bangalore',    group:'Work',     birthday:'1996-10-11', notes:'Product manager, great at strategy',      favourite:true  },
  { name:'Karan Malhotra', phone:'+91 82001 33456', email:'karan.malhotra@gmail.com',   company:'Bollywood Productions',     address:'Juhu, Mumbai',             group:'Friends',  birthday:'1993-03-27', notes:'Aspiring filmmaker, college buddy',        favourite:false },
  { name:'Meera Krishnan', phone:'+91 80000 44567', email:'meera.krishnan@isro.gov.in', company:'ISRO',                      address:'Vimanapura, Bangalore',    group:'College',  birthday:'1991-07-04', notes:'Aerospace engineer at ISRO, brilliant',   favourite:true  },
  { name:'Amit Joshi',     phone:'+91 78999 55678', email:'amit.joshi@paytm.com',       company:'Paytm',                    address:'Sector 132, Noida',        group:'Business', birthday:'1987-11-19', notes:'Fintech entrepreneur, investor',          favourite:false },
];

// Auto-seed contacts for a user (called after login/register)
async function autoSeedContacts(userId) {
  const existing = await contactsDB.count({ userId });
  if (existing > 0) return; // already has contacts, skip

  console.log(`[SEED] Adding 15 Indian contacts for user ${userId}...`);
  for (let i = 0; i < INDIAN_CONTACTS.length; i++) {
    const c = INDIAN_CONTACTS[i];
    await contactsDB.insert({
      userId,
      name:        c.name,
      phone:       c.phone,
      email:       c.email,
      company:     c.company,
      address:     c.address,
      group:       c.group,
      website:     '',
      birthday:    c.birthday,
      notes:       c.notes,
      favourite:   c.favourite,
      avatarColor: COLORS[i % COLORS.length],
      createdAt:   new Date(),
      updatedAt:   new Date(),
    });
  }
  console.log(`[SEED] Done! 15 contacts added for user ${userId}`);
}

// ══════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════

// REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const hashed = bcrypt.hashSync(password, 10);
    const user   = await usersDB.insert({ name, email, password: hashed, createdAt: new Date() });
    const token  = jwt.sign({ id: user._id, name, email }, JWT_SECRET, { expiresIn: '7d' });

    // ✅ Auto-seed 15 contacts immediately after register
    await autoSeedContacts(user._id);

    res.status(201).json({ token, user: { id: user._id, name, email } });
  } catch (e) {
    if (e.errorType === 'uniqueViolated')
      return res.status(409).json({ error: 'Email already registered.' });
    res.status(500).json({ error: 'Server error.' });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required.' });

    const user = await usersDB.findOne({ email });
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    // ✅ Auto-seed contacts on login too (if user has none)
    await autoSeedContacts(user._id);

    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET ME
app.get('/api/auth/me', auth, async (req, res) => {
  const user = await usersDB.findOne({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ id: user._id, name: user.name, email: user.email });
});

// ══════════════════════════════════════════════════
// CONTACT ROUTES
// ══════════════════════════════════════════════════

// GET all contacts
app.get('/api/contacts', auth, async (req, res) => {
  try {
    const { search, favourite, sort = 'name' } = req.query;
    let query = { userId: req.user.id };
    if (favourite === 'true') query.favourite = true;

    let list = await contactsDB.find(query);

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        (c.name    && c.name.toLowerCase().includes(s)) ||
        (c.email   && c.email.toLowerCase().includes(s)) ||
        (c.phone   && c.phone.toLowerCase().includes(s)) ||
        (c.company && c.company.toLowerCase().includes(s))
      );
    }

    list.sort((a, b) => {
      if (sort === 'recent')  return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === 'company') return (a.company||'').localeCompare(b.company||'');
      return a.name.localeCompare(b.name);
    });

    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch contacts.' });
  }
});

// GET single contact
app.get('/api/contacts/:id', auth, async (req, res) => {
  const c = await contactsDB.findOne({ _id: req.params.id, userId: req.user.id });
  if (!c) return res.status(404).json({ error: 'Contact not found.' });
  res.json(c);
});

// POST add contact
app.post('/api/contacts', auth, async (req, res) => {
  try {
    const { name, email, phone, address, company, notes, group, website, birthday } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const c = await contactsDB.insert({
      userId: req.user.id, name, email: email||'', phone: phone||'',
      address: address||'', company: company||'', notes: notes||'',
      group: group||'General', website: website||'', birthday: birthday||'',
      favourite: false, avatarColor: color,
      createdAt: new Date(), updatedAt: new Date()
    });
    res.status(201).json(c);
  } catch {
    res.status(500).json({ error: 'Failed to add contact.' });
  }
});

// PUT update contact
app.put('/api/contacts/:id', auth, async (req, res) => {
  try {
    const c = await contactsDB.findOne({ _id: req.params.id, userId: req.user.id });
    if (!c) return res.status(404).json({ error: 'Contact not found.' });
    const { name, email, phone, address, company, notes, group, website, birthday } = req.body;
    await contactsDB.update({ _id: req.params.id }, { $set: {
      name: name||c.name, email: email??c.email, phone: phone??c.phone,
      address: address??c.address, company: company??c.company,
      notes: notes??c.notes, group: group??c.group,
      website: website??c.website, birthday: birthday??c.birthday,
      updatedAt: new Date()
    }});
    res.json(await contactsDB.findOne({ _id: req.params.id }));
  } catch {
    res.status(500).json({ error: 'Failed to update.' });
  }
});

// PATCH favourite
app.patch('/api/contacts/:id/favourite', auth, async (req, res) => {
  try {
    const c = await contactsDB.findOne({ _id: req.params.id, userId: req.user.id });
    if (!c) return res.status(404).json({ error: 'Not found.' });
    const newFav = !c.favourite;
    await contactsDB.update({ _id: req.params.id }, { $set: { favourite: newFav } });
    res.json({ favourite: newFav, id: req.params.id });
  } catch {
    res.status(500).json({ error: 'Failed.' });
  }
});

// DELETE contact
app.delete('/api/contacts/:id', auth, async (req, res) => {
  try {
    const c = await contactsDB.findOne({ _id: req.params.id, userId: req.user.id });
    if (!c) return res.status(404).json({ error: 'Not found.' });
    await contactsDB.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed.' });
  }
});

// GET stats
app.get('/api/stats', auth, async (req, res) => {
  try {
    const total      = await contactsDB.count({ userId: req.user.id });
    const favourites = await contactsDB.count({ userId: req.user.id, favourite: true });
    const all        = await contactsDB.find({ userId: req.user.id });
    const groups     = all.reduce((acc, c) => { acc[c.group||'General'] = (acc[c.group||'General']||0)+1; return acc; }, {});
    res.json({ total, favourites, groups });
  } catch {
    res.status(500).json({ error: 'Failed.' });
  }
});

// GET groups
app.get('/api/groups', auth, async (req, res) => {
  const all = await contactsDB.find({ userId: req.user.id });
  res.json([...new Set(all.map(c => c.group||'General'))].sort());
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '3.0' }));

// Start
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   iAddress Pro v3 — Server Running      ║');
  console.log(`║   http://localhost:${PORT}                  ║`);
  console.log('║   15 Indian contacts auto-added on login ║');
  console.log('╚══════════════════════════════════════════╝\n');
});