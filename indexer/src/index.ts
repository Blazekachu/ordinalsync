import { createApi } from './api.js';

const PORT = parseInt(process.env.PORT || '3001');

console.log('Starting OrdinalSync Indexer...');
console.log('---');
console.log('Phase 1 PoC - In-memory store, no live Bitcoin connection');
console.log('For testnet demo, inscriptions are registered manually via API');
console.log('---');

createApi(PORT);
