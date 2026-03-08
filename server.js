require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const dbPath = path.resolve(__dirname, 'payment_db.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    createTables();
  }
});

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    interest_rate REAL NOT NULL,
    tenure INTEGER NOT NULL,
    emi_due REAL NOT NULL
  )`, (err) => {
    if (err) console.error("Error creating customers table:", err);
    else insertDummyData();
  });

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    payment_date TEXT NOT NULL,
    payment_amount REAL NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`);
}

function insertDummyData() {
  const insert = db.prepare('INSERT OR IGNORE INTO customers (account_number, name, issue_date, interest_rate, tenure, emi_due) VALUES (?, ?, ?, ?, ?, ?)');
  insert.run('ACC-1001', 'Alex Mercer', '2023-01-15', 10.50, 24, 5200.00);
  insert.run('ACC-1002', 'Sarah Jenkins', '2023-05-20', 11.25, 36, 3100.50);
  insert.run('ACC-1003', 'John Doe', '2024-02-10', 9.75, 12, 12500.00);
  insert.finalize();
}

// Routes
app.get('/customers', (req, res) => {
  const query = `
    SELECT 
      c.*,
      COALESCE(SUM(CASE WHEN p.status = 'SUCCESS' THEN p.payment_amount ELSE 0 END), 0) as total_paid,
      COUNT(CASE WHEN p.status = 'SUCCESS' THEN 1 END) as paid_emis
    FROM customers c
    LEFT JOIN payments p ON c.id = p.customer_id
    GROUP BY c.id
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to retrieve customers' });
    res.json(rows);
  });
});

app.post('/payments', (req, res) => {
  const { account_number, amount, status } = req.body;
  if (!account_number || !amount) {
    return res.status(400).json({ error: 'account_number and amount are required' });
  }

  const paymentStatus = status || 'SUCCESS';

  db.get('SELECT id, emi_due FROM customers WHERE account_number = ?', [account_number], (err, customer) => {
    if (err) return res.status(500).json({ error: 'Database error finding customer' });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const paymentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    db.run(
      'INSERT INTO payments (customer_id, payment_date, payment_amount, status) VALUES (?, ?, ?, ?)',
      [customer.id, paymentDate, amount, paymentStatus],
      function (err) {
        if (err) return res.status(500).json({ error: 'Failed to process payment' });
        res.status(201).json({
          message: 'Payment created successfully',
          payment_id: this.lastID,
          account_number: account_number,
          amount: amount,
          status: paymentStatus
        });
      }
    );
  });
});

app.put('/payments/:id/status', (req, res) => {
  const paymentId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  db.run(
    'UPDATE payments SET status = ? WHERE id = ?',
    [status, paymentId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update payment status' });
      if (this.changes === 0) return res.status(404).json({ error: 'Payment not found' });

      res.json({
        message: 'Payment status updated successfully',
        payment_id: paymentId,
        status: status
      });
    }
  );
});

app.get('/payments/:account_number', (req, res) => {
  const accountNumber = req.params.account_number;
  db.get('SELECT id FROM customers WHERE account_number = ?', [accountNumber], (err, customer) => {
    if (err) return res.status(500).json({ error: 'Database error finding customer' });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    db.all('SELECT * FROM payments WHERE customer_id = ? ORDER BY payment_date DESC', [customer.id], (err, payments) => {
      if (err) return res.status(500).json({ error: 'Failed to retrieve payments' });
      res.json(payments);
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

