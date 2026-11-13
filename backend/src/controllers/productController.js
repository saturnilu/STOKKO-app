const productModel = require('../models/productModel');
const { cloudinary } = require('../config/cloudinary');
const { successResponse, errorResponse } = require('../utils/response');
require('dotenv').config();

const getAll = async (req, res) => {
  try {
    const { category, search, seller_id } = req.query;
    const products = await productModel.getAll({ category, search, seller_id });
    return successResponse(res, 'Successfully retrieved products.', { products });
  } catch (err) {
    console.error('getAll products error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const getById = async (req, res) => {
  try {
    const product = await productModel.getById(req.params.id);
    if (!product) {
      return errorResponse(res, 'Product not found.', 404);
    }
    await productModel.incrementViews(req.params.id);
    return successResponse(res, 'OK', { product });
  } catch (err) {
    console.error('getById product error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const getBySeller = async (req, res) => {
  try {
    const products = await productModel.getBySeller(req.user.id);
    const productsWithInsights = products.map(product => {
      const item = product.toJSON ? product.toJSON() : { ...product };
      const views = item.views || 0;
      const sales = item.sales_count || 0;
      const conversionRate = views > 0 ? (sales / views) * 100 : 0; 
      let action = 'Keep';
      let suggestionText = 'The current price is reasonable and appropriate.';
      if (views > 0) {
          if (conversionRate < 5) {
              action = 'Decrease';
              suggestionText = 'It gets plenty of views but rarely results in a purchase. Try lowering the price a little.';
          } else if (conversionRate >= 20) {
              action = 'Increase';
              suggestionText = 'A best selling product! A great opportunity to increase profit margins.';
          }
      }
      return {
          ...item,
          recommendedAction: action,
          reason: suggestionText
      };
    });
    return successResponse(res, 'OK', { products: productsWithInsights });
  } catch (err) {
    console.error('getBySeller error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const create = async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;

    if (!name || !category || price === undefined || stock === undefined) {
      if (req.file?.path) {
        const publicId = req.file.public_id || req.file.filename;
        await cloudinary.uploader.destroy(publicId);
      }
      return errorResponse(res, 'Name, category, price, and stock must be filled in.', 400);
    }

    const validCategories = ['Meat', 'Vegetables', 'Dairy', 'Fruits', 'Other', 'Snacks', 'Drinks'];
    if (!validCategories.includes(category)) {
      return errorResponse(res, 'Category is invalid', 400);
    }

    if (isNaN(price) || price < 0) {
      return errorResponse(res, 'Price is invalid.', 400);
    }

    if (isNaN(stock) || stock < 0) {
      return errorResponse(res, 'Stock is invalid', 400);
    }

    const imageUrl = req.file ? req.file.path : null;

    const productId = await productModel.create({
      sellerId: req.user.id,
      name,
      category,
      price: parseInt(price),
      stock: parseInt(stock),
      imageUrl,
    });

    const product = await productModel.getById(productId);
    return successResponse(res, 'Product successfully added.', { product }, 201);
  } catch (err) {
    console.error('create product error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const update = async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;
    const imageUrl = req.file ? req.file.path : undefined;

    const updated = await productModel.update(req.params.id, req.user.id, {
      name, category,
      price: price !== undefined ? parseInt(price) : undefined,
      stock: stock !== undefined ? parseInt(stock) : undefined,
      imageUrl,
    });

    if (!updated) {
      return errorResponse(res, 'Product not found or does not belong to you.', 404);
    }

    return successResponse(res, 'Product successfully updated.');
  } catch (err) {
    console.error('update product error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const remove = async (req, res) => {
  try {
    const deleted = await productModel.remove(req.params.id, req.user.id);
    if (!deleted) {
      return errorResponse(res, 'Product not found or does not belong to you.', 404);
    }
    return successResponse(res, 'Product successfully deleted.');
  } catch (err) {
    console.error('remove product error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const toggleBoost = async (req, res) => {
  try {
    const result = await productModel.toggleBoost(req.params.id, req.user.id);
    if (result === null) {
      return errorResponse(res, 'Product not found or does not belong to you.', 404);
    }
    return successResponse(res, result ? 'Product successfully boosted!' : 'Product boost has been disabled.', { is_boosted: result });
  } catch (err) {
    console.error('toggleBoost error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

module.exports = { getAll, getById, getBySeller, create, update, remove, toggleBoost };