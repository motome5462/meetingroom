require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http);

app.set('io', io);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DB_URI;

mongoose.connection.on('connected', () => {
  console.log('Mongoose event: connected to MongoDB');
});
mongoose.connection.on('error', (err) => {
  console.error('Mongoose event: connection error:', err);
});
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose event: disconnected from MongoDB');
});

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected (promise resolved)');

  io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

socket.on('requestSchedule', async ({ date } = {}) => {
  const Meeting = require('./models/meetinglist');
  const selectedDate = date || new Date().toISOString().substring(0, 10);

  const start = new Date(`${selectedDate}T00:00:00`);
  const end = new Date(`${selectedDate}T23:59:59`);

  const meetings = await Meeting.find({
    datetimein: { $gte: start, $lte: end }
  }).lean();

  socket.emit('scheduleUpdate', meetings);
});

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

  http.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
})
.catch(err => {
  console.error('MongoDB connection error (promise rejected):', err);
});
