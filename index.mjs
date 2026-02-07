import WebSocket from 'ws';

const ws = new WebSocket('wss://clearnet.yellow.com/ws');

ws.on('open', () => {
  console.log('Connected...\n');

  ws.send(JSON.stringify({
    req: [1, 'get_config', {}, Date.now()],
    sig: []
  }));
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());

  console.log('\n📦 FULL MESSAGE FROM CLEARNODE:\n');
  console.dir(msg, { depth: null });

  ws.close();
});
