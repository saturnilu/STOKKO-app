const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('./config/passport');
require('dotenv').config();
const app = express();
const allowedOrigins = [
  'http://127.0.0.1:5501',
  'http://localhost:5501',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:5502',
  'http://localhost:5502',
  'https://stokko-app.vercel.app'
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'stokko_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' },
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/products',      require('./routes/products'));
app.use('/api/stores',        require('./routes/stores'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
const { cartRouter, orderRouter, notifRouter } = require('./routes/cartOrderNotif');
app.use('/api/cart',          cartRouter);
app.use('/api/orders',        orderRouter);
app.use('/api/notifications', notifRouter);
app.use('/api/insights', require('./routes/insightRoutes'));
app.use('/api/chat', require('./routes/chat'));
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
});
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Server error.' });
});
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});
app.set('io', io); 
require('./socket/chatSocket')(io);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 STOKKO Backend running on http://localhost:${PORT}`);
});
module.exports = app;