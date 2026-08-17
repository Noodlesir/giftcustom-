'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const { generateThemes } = require('./lib/themes');
const { createOrder, getOrder } = require('./lib/orders');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ------------------------------------------------------------------ */
/* API routes                                                          */
/* ------------------------------------------------------------------ */

// POST /api/themes  -> generate AI theme ideas for the recipient/occasion/budget
app.post('/api/themes', async (req, res) => {
  try {
    const { themes, source } = await generateThemes(req.body);
    res.json({ themes, source });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Failed to generate themes' });
  }
});

// POST /api/orders  -> confirm and persist a gift order
app.post('/api/orders', async (req, res) => {
  try {
    const order = await createOrder(req.body);
    res.status(201).json(order);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Failed to create order' });
  }
});

// GET /api/orders/:orderId  -> look up an existing order (e.g. confirmation page reload)
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const order = await getOrder(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to look up order' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY) });
});

app.listen(PORT, () => {
  console.log(`GiftCustom server running at http://localhost:${PORT}`);
  console.log(process.env.ANTHROPIC_API_KEY
    ? 'AI theme generation: enabled'
    : 'AI theme generation: disabled (no ANTHROPIC_API_KEY set) — using deterministic fallback');
});
