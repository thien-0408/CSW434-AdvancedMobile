const express = require('express');
const http = require('node:http');
const {randomUUID} = require('node:crypto');
const {Server} = require('socket.io');
const cors = require('cors');

function createChatServer() {
  const app = express();
  app.use(cors());
  app.get('/health', (_req, res) => res.json({status: 'ok'}));
  const server = http.createServer(app);
  const io = new Server(server, {cors: {origin: '*'}});
  io.on('connection', socket => {
    socket.on('join', (payload, reply) => {
      const name = payload?.userName;
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 40) {
        reply?.({ok: false, error: 'Enter a name of 1?40 characters.'});
        return;
      }
      socket.data.userName = name.trim();
      console.log(`${socket.data.userName} joined the group.`);
      reply?.({ok: true});
    });
    socket.on('sendMessage', (payload, reply) => {
      const text = payload?.text;
      if (!socket.data.userName) {
        reply?.({ok: false, error: 'Join the group before sending messages.'});
        return;
      }
      if (typeof text !== 'string' || !text.trim() || text.trim().length > 2000) {
        reply?.({ok: false, error: 'Enter a message of 1?2000 characters.'});
        return;
      }
      io.emit('receiveMessage', {
        id: randomUUID(),
        text: text.trim(),
        sender: socket.data.userName,
        senderId: socket.id,
        time: new Date().toISOString(),
      });
      reply?.({ok: true});
    });
    socket.on('disconnect', () => {
      if (socket.data.userName) console.log(`${socket.data.userName} left the group.`);
    });
  });
  return {server, io};
}
if (require.main === module) {
  const {server} = createChatServer();
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Chat server listening on port ${port}`));
}
module.exports = {createChatServer};
