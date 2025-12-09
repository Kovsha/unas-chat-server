const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // UNAS oldalról engedélyezés
});

// Statikus admin oldal kiszolgálása
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Felhasználói üzenet
  socket.on('chat_message', (data) => {
    console.log('Message from user:', data);

    // Visszaküldjük minden kliensnek, hogy a felhasználó is lássa
    io.emit('chat_message', data);
  });

  // Admin üzenet küldése a szerver felől
  socket.on('admin_message', (data) => {
    console.log('Admin sends:', data);
    io.emit('chat_message', { text: data.text, sender: 'admin' });
  });

  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
