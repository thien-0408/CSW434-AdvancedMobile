const {test} = require('node:test');
const assert = require('node:assert/strict');
const {once} = require('node:events');
const {io: connect} = require('socket.io-client');
const {createChatServer} = require('../server');

async function fixture(t) {
  const {server, io} = createChatServer();
  const clients = [];
  t.after(async () => {
    clients.forEach(client => client.disconnect());
    await new Promise(resolve => io.close(resolve));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  async function client(name) {
    const socket = connect(url, {autoConnect: false, transports: ['websocket'], reconnection: false});
    clients.push(socket);
    const ready = once(socket, 'connect');
    socket.connect();
    await ready;
    if (name) assert.deepEqual(await socket.emitWithAck('join', {userName: name}), {ok: true});
    return socket;
  }
  return {client, url};
}

test('health endpoint responds', {timeout: 5000}, async t => {
  const {url} = await fixture(t);
  assert.deepEqual(await (await fetch(`${url}/health`)).json(), {status: 'ok'});
});

test('broadcasts one identical message to the sender and two simultaneous peers', {timeout: 5000}, async t => {
  const {client} = await fixture(t);
  const a = await client('nguyendinhthien');
  const b = await client('User Two');
  const c = await client('User Three');
  const received = [a, b, c].map(socket => once(socket, 'receiveMessage'));
  assert.deepEqual(await a.emitWithAck('sendMessage', {text: '  Hello group!  ', sender: 'spoofed'}), {ok: true});
  const results = (await Promise.all(received)).map(([message]) => message);
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[1], results[2]);
  assert.equal(results[0].text, 'Hello group!');
  assert.equal(results[0].sender, 'nguyendinhthien');
  assert.equal(results[0].senderId, a.id);
  assert.ok(results[0].id);
  assert.ok(Number.isFinite(Date.parse(results[0].time)));
  const next = once(a, 'receiveMessage');
  await b.emitWithAck('sendMessage', {text: 'Reply'});
  assert.equal((await next)[0].sender, 'User Two');
});

test('rejects blank, malformed and overlong names', {timeout: 5000}, async t => {
  const {client} = await fixture(t);
  const a = await client();
  for (const payload of [null, {}, {userName: '   '}, {userName: 123}, {userName: 'x'.repeat(41)}]) {
    assert.equal((await a.emitWithAck('join', payload)).ok, false);
  }
  assert.equal((await a.emitWithAck('join', {userName: ' nguyendinhthien '})).ok, true);
});

test('rejects messages before joining', {timeout: 5000}, async t => {
  const {client} = await fixture(t);
  const a = await client();
  assert.equal((await a.emitWithAck('sendMessage', {text: 'Hello'})).ok, false);
});

test('does not broadcast blank, malformed or overlong messages', {timeout: 5000}, async t => {
  const {client} = await fixture(t);
  const a = await client('nguyendinhthien');
  const received = [];
  a.on('receiveMessage', item => received.push(item));
  for (const payload of [null, {}, {text: '   '}, {text: 123}, {text: 'x'.repeat(2001)}]) {
    assert.equal((await a.emitWithAck('sendMessage', payload)).ok, false);
  }
  // Socket events preserve order: receipt of this valid message follows invalid ones.
  const valid = once(a, 'receiveMessage');
  await a.emitWithAck('sendMessage', {text: 'valid'});
  await valid;
  assert.deepEqual(received.map(item => item.text), ['valid']);
});

test('two users with the same display name have distinct sender IDs', {timeout: 5000}, async t => {
  const {client} = await fixture(t);
  const a = await client('nguyendinhthien');
  const b = await client('nguyendinhthien');
  const received = once(a, 'receiveMessage');
  await b.emitWithAck('sendMessage', {text: 'Same name, other device'});
  const [message] = await received;
  assert.equal(message.senderId, b.id);
  assert.notEqual(message.senderId, a.id);
});

test('a returning client can reconnect, rejoin and send again', {timeout: 5000}, async t => {
  const {client} = await fixture(t);
  const a = await client('nguyendinhthien');
  const b = await client('User Two');
  const oldId = a.id;
  a.disconnect();
  const ready = once(a, 'connect');
  a.connect();
  await ready;
  assert.notEqual(a.id, oldId);
  assert.equal((await a.emitWithAck('sendMessage', {text: 'before rejoin'})).ok, false);
  assert.equal((await a.emitWithAck('join', {userName: 'nguyendinhthien'})).ok, true);
  const received = once(b, 'receiveMessage');
  await a.emitWithAck('sendMessage', {text: 'After reconnect'});
  assert.equal((await received)[0].sender, 'nguyendinhthien');
});
