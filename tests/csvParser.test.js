'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { parseCsv } = require('../src/ingestion/csvParser');

const HEADERS = 'transaction_id,timestamp,type,asset,quantity,price_usd,fee,note\n';

function writeTmpCsv(rows) {
  const content = HEADERS + rows.join('\n');
  const tmpFile = path.join(os.tmpdir(), `test-${Date.now()}.csv`);
  fs.writeFileSync(tmpFile, content, 'utf8');
  return tmpFile;
}

describe('csvParser', () => {
  test('parses a valid row without quality issues', async () => {
    const file = writeTmpCsv(['EXC-001,2024-03-01T09:00:00Z,BUY,BTC,0.5,62000,0.0005,test']);
    const rows = await parseCsv(file, 'exchange');
    expect(rows[0].isInvalid).toBe(false);
    expect(rows[0].normalized.asset).toBe('BTC');
    expect(rows[0].normalized.quantity).toBe(0.5);
  });
  test('flags a malformed timestamp as error', async () => {
    const file = writeTmpCsv(['USR-018,2024-03-09T,SELL,ETH,0.3,3510,0.0003,bad ts']);
    const rows = await parseCsv(file, 'user');
    expect(rows[0].isInvalid).toBe(true);
    expect(rows[0].qualityIssues.find((q) => q.field === 'timestamp').severity).toBe('error');
  });
  test('flags negative quantity as error', async () => {
    const file = writeTmpCsv(['USR-019,2024-03-10T08:00:00Z,BUY,BTC,-0.1,62000,0.0001,neg']);
    const rows = await parseCsv(file, 'user');
    expect(rows[0].isInvalid).toBe(true);
  });
  test('normalises bitcoin alias to BTC', async () => {
    const file = writeTmpCsv(['USR-005,2024-03-03T10:00:00Z,BUY,bitcoin,0.25,61800,0.00025,alias']);
    const rows = await parseCsv(file, 'user');
    expect(rows[0].normalized.asset).toBe('BTC');
  });
});

