const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let users = {}; // socketId => { socket, userType }

io.on('connection', (socket) => {
  console.log('User connected: ' + socket.id);

  // Üzenet a felhasználótól
  socket.on('chat_message', (data) => {
    users[socket.id] = { socket, userType: 'user' };
    console.log('Message from user:', { ...data, senderId: socket.id });

    // Adminoknak továbbítjuk
    for (let id in users) {
      if(users[id].userType === 'admin'){
        users[id].socket.emit('chat_message', {
          text: data.text,
          senderId: socket.id
        });
      }
    }
  });

  // Admin üzenet egy kiválasztott usernek
  socket.on('admin_message', (data) => {
    if (!data.receiverId || !users[data.receiverId]) return;
    console.log('Admin sends:', data);
    users[data.receiverId].socket.emit('chat_message', { 
      text: data.text, 
      senderId: 'admin' 
    });
  });

  // Admin csatlakozás
  socket.on('register_admin', () => {
    users[socket.id] = { socket, userType: 'admin' };
    console.log('Admin connected: ' + socket.id);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected: ' + socket.id);
    delete users[socket.id];
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
