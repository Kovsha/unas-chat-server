const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let users = {}; // socketId => { socket, userType, name }

io.on('connection', (socket) => {
  console.log('User connected: ' + socket.id);

  // Felhasználó regisztrálása névvel
  socket.on('register_user', (data) => {
    users[socket.id] = { socket, userType: 'user', name: data.name };
    console.log(`User registered: ${data.name} (${socket.id})`);
    
    // Adminoknak jelezzük az új aktív usert
    for (let id in users) {
      if(users[id].userType === 'admin'){
        users[id].socket.emit('active_users', { socketId: socket.id, name: data.name });
      }
    }
  });

  // Üzenet a felhasználótól
  socket.on('chat_message', (data) => {
    if(!users[socket.id]) return;
    const senderName = users[socket.id].name || socket.id;
    console.log('Message from user:', { text: data.text, senderId: senderName });

    // Adminoknak továbbítjuk
    for (let id in users) {
      if(users[id].userType === 'admin'){
        users[id].socket.emit('chat_message', {
          text: data.text,
          senderId: senderName
        });
      }
    }
  });

  // Admin üzenet egy kiválasztott usernek
  socket.on('admin_message', (data) => {
    if (!data.receiverName) return;

    // Keressük meg a socketId-t a név alapján
    const targetId = Object.keys(users).find(id => users[id].name === data.receiverName);
    if(!targetId) return;

    console.log('Admin sends:', { text: data.text, receiverName: data.receiverName });
    users[targetId].socket.emit('chat_message', { 
      text: data.text, 
      senderId: 'admin' 
    });
  });

  // Admin csatlakozás
  socket.on('register_admin', () => {
    users[socket.id] = { socket, userType: 'admin', name: 'admin' };
    console.log('Admin connected: ' + socket.id);
    
    // Adminnak küldjük az aktuális felhasználókat
    const activeUsers = Object.values(users)
      .filter(u => u.userType==='user')
      .map(u => ({ name: u.name }));
    socket.emit('active_users_list', activeUsers);
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if(user) console.log(`${user.userType} disconnected: ${user.name || socket.id}`);
    
    // Adminoknak jelezzük a disconnectet
    for (let id in users) {
      if(users[id].userType === 'admin' && user?.userType === 'user'){
        users[id].socket.emit('user_disconnected', { name: user.name });
      }
    }

    delete users[socket.id];
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
