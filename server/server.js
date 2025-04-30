import express from 'express';
import { Server } from 'socket.io';
import http from 'node:http';
import path from 'node:path';
import url from 'node:url';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ../client 폴더를 static 경로로 지정
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', (socket) => {
  console.log('new client connected', socket.id);

  socket.on('join', (roomId) => {
    console.log(`client ${socket.id} joined room: ${roomId}`);
    socket.join(roomId);

    socket.to(roomId).emit('welcome');
  });

  socket.on('offer', ({ roomId, offer }) => {
    console.log('offer received', roomId);
    socket.to(roomId).emit('offer', offer);
  });

  socket.on('answer', ({ roomId, answer }) => {
    console.log('answer received', roomId);
    socket.to(roomId).emit('answer', answer);
  });

  socket.on('candidate', ({ roomId, candidate }) => {
    console.log('ice candidate received', roomId);
    socket.to(roomId).emit('candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id);
  });
});

server.listen(3000, () => {
  console.log(`server running at http://localhost:${PORT}`);
});
