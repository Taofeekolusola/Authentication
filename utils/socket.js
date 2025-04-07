const setupSocketIO = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    console.log('User connected:', userId);

    const roomName = `notification_${userId}`;
    socket.join(roomName);
    console.log('User joined room:', roomName);

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.userId);
    });
  });
};

module.exports = { setupSocketIO };
