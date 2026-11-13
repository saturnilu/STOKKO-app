const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage khusus untuk gambar produk
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'stokko/products',       
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 600, height: 400, crop: 'fill' }], 
  },
});

// Storage khusus untuk avatar/logo toko
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'stokko/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'fill' }],
  },
});

// Storage khusus untuk banner toko
const bannerStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'stokko/banners',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 200, crop: 'fill' }],
  },
});

// Storage gabungan
const storeImageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    if (file.fieldname === 'logo') {
      return {
        folder: 'stokko/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 200, height: 200, crop: 'fill' }],
      };
    }
    return {
      folder: 'stokko/banners',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 800, height: 200, crop: 'fill' }],
    };
  },
});

const fileSizeLimit = 2 * 1024 * 1024;

const uploadProduct = multer({
  storage: productStorage,
  limits: { fileSize: fileSizeLimit },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('The file must be an image (JPG, PNG, WebP).'), false);
    }
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: fileSizeLimit },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('The file must be an image (JPG, PNG, WebP).'), false);
    }
  },
});

const uploadBanner = multer({
  storage: bannerStorage,
  limits: { fileSize: fileSizeLimit },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('The file must be an image (JPG, PNG, WebP).'), false);
    }
  },
});

const uploadStoreImages = multer({
  storage: storeImageStorage,
  limits: { fileSize: fileSizeLimit },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('The file must be an image (JPG, PNG, WebP).'), false);
    }
  },
});

module.exports = { cloudinary, uploadProduct, uploadAvatar, uploadBanner, uploadStoreImages };