const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// users: socketId => { socket, userType, name }
// chatHistory: userName => [{ text, sender }]
let users = {};
let chatHistory = {};

io.on('connection', (socket) => {
  console.log('Socket connected: ' + socket.id);

  // User regisztráció névvel
  socket.on('register_user', (data) => {
    const name = data.name || socket.id;
    users[socket.id] = { socket, userType: 'user', name };
    if(!chatHistory[name]) chatHistory[name] = [];
    console.log(`User registered: ${name} (${socket.id})`);

    // Adminoknak küldjük az új aktív usert
    for (let id in users) {
      if(users[id].userType === 'admin'){
        users[id].socket.emit('active_users', { name });
      }
    }
  });

  // User üzenet
  socket.on('chat_message', (data) => {
    const user = users[socket.id];
    if(!user || user.userType !== 'user') return;

    const msg = { text: data.text, sender: 'user', name: user.name };
    chatHistory[user.name].push(msg);

    console.log('Message from user:', msg);

    // Küldés minden adminnak
    for (let id in users) {
      if(users[id].userType === 'admin'){
        users[id].socket.emit('chat_message', msg);
      }
    }
  });

  // Admin üzenet kiválasztott usernek
  socket.on('admin_message', (data) => {
    if(!data.receiverName || !users) return;

    // Keressük a user socketjét
    const targetSocketEntry = Object.values(users).find(u => u.name === data.receiverName && u.userType === 'user');
    if(!targetSocketEntry) return;

    const msg = { text: data.text, sender: 'admin', name: 'admin' };
    chatHistory[data.receiverName].push(msg);

    targetSocketEntry.socket.emit('chat_message', msg);
    console.log('Admin sends:', { text: data.text, receiverName: data.receiverName });
  });

  // Admin csatlakozás
  socket.on('register_admin', () => {
    users[socket.id] = { socket, userType: 'admin', name: 'admin' };
    console.log('Admin connected: ' + socket.id);

    // Aktív user lista és chat history küldése
    const activeUsers = Object.values(users)
      .filter(u => u.userType === 'user')
      .map(u => u.name);

    // Aktív user lista
    socket.emit('active_users_list', activeUsers);

    // Minden user chat history küldése az adminnak
    for(let name of activeUsers){
      if(chatHistory[name] && chatHistory[name].length > 0){
        chatHistory[name].forEach(msg => socket.emit('chat_message', msg));
      }
    }
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if(user) console.log(`${user.userType} disconnected: ${user.name}`);

    // Adminoknak jelezzük, ha user disconnect
    if(user?.userType === 'user'){
      for(let id in users){
        if(users[id].userType === 'admin'){
          users[id].socket.emit('user_disconnected', { name: user.name });
        }
      }
    }

    delete users[socket.id];
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
