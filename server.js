require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');  // Your Express app
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http);

app.set('io', io);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DB_URI;

// MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Connect to MongoDB and then start server + setup Socket.IO
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected (promise resolved)');

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Listen for client schedule requests by date
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

        // Emit only to the requesting client
        socket.emit('scheduleUpdate', meetings);
      } catch (err) {
        console.error('Error fetching meetings:', err);
        socket.emit('scheduleUpdate', []); // empty array on error
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  /**
   * Broadcast all meetings in a given month to all connected clients.
   * Useful for monthly calendar updates.
   *
   * @param {number|string} year - Full year, e.g. 2025
   * @param {number|string} month - 1-based month number (1-12)
   */
  const broadcastMonthlyUpdate = async (year, month) => {
    const Meeting = require('./models/meetinglist');
    const monthStr = String(month).padStart(2, '0');
    const start = new Date(`${year}-${monthStr}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    try {
      const meetings = await Meeting.find({
        datetimein: { $gte: start, $lt: end }
      }).lean();

      // Format meetings for minimal payload
      const formatted = meetings.map(m => ({
        date: m.datetimein.toISOString().split('T')[0],
        time: m.datetimein.toTimeString().slice(0, 5) + '-' + m.datetimeout.toTimeString().slice(0, 5),
        room: m.room,
        approval: m.approval || null,
      }));

      io.emit('meetingsUpdated', { year, month, meetings: formatted });
      console.log(`Broadcasted monthly update for ${year}-${monthStr}, meetings count: ${meetings.length}`);
    } catch (err) {
      console.error('Error broadcasting monthly meetings:', err);
    }
  };

  // Make this available in your Express app for other modules/controllers
  app.set('broadcastMonthlyUpdate', broadcastMonthlyUpdate);

  http.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});
