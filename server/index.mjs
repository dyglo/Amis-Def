import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import intelRouter from './routes/intel.mjs';

dotenv.config({ path: '.env.local' });

const app = express();
const port = Number(process.env.INTEL_SERVER_PORT || 8787);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use('/api/intel', intelRouter);

app.listen(port, () => {
  console.log(`Intel proxy listening on http://localhost:${port}`);
});
