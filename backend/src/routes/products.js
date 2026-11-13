const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { requirePremium } = require('../middleware/premium');
const { uploadProduct } = require('../config/cloudinary');

router.get('/', productController.getAll);

router.get('/seller/my',
  verifyToken,
  requireRole('seller'),
  productController.getBySeller
);

router.post('/seller',
  verifyToken,
  requireRole('seller'),
  uploadProduct.single('image'),
  productController.create
);

router.put('/seller/:id',
  verifyToken,
  requireRole('seller'),
  uploadProduct.single('image'),
  productController.update
);

router.delete('/seller/:id',
  verifyToken,
  requireRole('seller'),
  productController.remove
);

router.patch('/seller/:id/boost',
  verifyToken,
  requireRole('seller'),
  requirePremium,
  productController.toggleBoost
);

router.get('/:id', productController.getById);

module.exports = router;
