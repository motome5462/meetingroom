require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');  // Your Express app
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http);

app.set('io', io);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DB_URI;

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
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
      const selectedDate = date || new Date().toISOString().slice(0, 10);

      const start = new Date(`${selectedDate}T00:00:00`);
      const end = new Date(`${selectedDate}T23:59:59`);

      try {
        const meetings = await Meeting.find({
          datetimein: { $gte: start, $lte: end }
        })
        .populate('employee', 'name')
        .populate('participants', 'name')
        .lean();

        socket.emit('scheduleUpdate', meetings);
      } catch (err) {
        console.error('Error fetching meetings:', err);
        socket.emit('scheduleUpdate', []);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Broadcast updated meetings for a month to all clients
  const broadcastMonthlyUpdate = async (year, month) => {
    const Meeting = require('./models/meetinglist');
    const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    try {
      const meetings = await Meeting.find({
        datetimein: { $gte: start, $lt: end }
      }).lean();

      const formatted = meetings.map(m => ({
        date: m.datetimein.toISOString().split('T')[0],
        time: m.datetimein.toTimeString().slice(0, 5) + '-' + m.datetimeout.toTimeString().slice(0, 5),
        room: m.room
      }));

      io.emit('meetingsUpdated', { year, month, meetings: formatted });
    } catch (err) {
      console.error('Error broadcasting monthly meetings:', err);
    }
  };

  app.set('broadcastMonthlyUpdate', broadcastMonthlyUpdate);

  http.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});
