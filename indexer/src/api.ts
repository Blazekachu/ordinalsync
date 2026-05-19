import express from 'express';
import type { TokenizedInscription } from './types.js';

const tokenizedInscriptions = new Map<string, TokenizedInscription>();

export function createApi(port: number = 3001) {
  const app = express();
  app.use(express.json());

  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH');
    next();
  });

  app.get('/api/tokenized', (_req, res) => {
    res.json(Array.from(tokenizedInscriptions.values()));
  });

  app.get('/api/tokenized/:inscriptionId', (req, res) => {
    const entry = tokenizedInscriptions.get(req.params.inscriptionId);
    if (!entry) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    res.json(entry);
  });

  app.post('/api/tokenized', (req, res) => {
    const inscription: TokenizedInscription = req.body;
    tokenizedInscriptions.set(inscription.inscriptionId, inscription);
    res.status(201).json(inscription);
  });

  app.patch('/api/tokenized/:inscriptionId', (req, res) => {
    const entry = tokenizedInscriptions.get(req.params.inscriptionId);
    if (!entry) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    Object.assign(entry, req.body);
    tokenizedInscriptions.set(req.params.inscriptionId, entry);
    res.json(entry);
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', tokenized_count: tokenizedInscriptions.size });
  });

  const server = app.listen(port, () => {
    console.log(`OrdinalSync indexer API running on port ${port}`);
  });

  return { app, server, tokenizedInscriptions };
}
