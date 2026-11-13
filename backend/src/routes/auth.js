const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');

router.post('/register', authController.register);
router.post('/login',    authController.login);
router.post('/logout',   authController.logout);

router.get('/me', verifyToken, authController.getMe);
router.put('/me', verifyToken, uploadAvatar.single('avatar'), authController.updateProfile);
router.put('/switch-role', verifyToken, authController.switchRole);

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/auth/google/failure',
    session: false,
  }),
  authController.googleCallback
);

router.get('/google/failure', (req, res) => {
  res.status(401).json({ message: 'Failed login with google.' });
});

module.exports = router;