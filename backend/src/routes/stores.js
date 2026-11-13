const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadStoreImages } = require('../config/cloudinary');
const { successResponse, errorResponse } = require('../utils/response');

router.put('/me', verifyToken, requireRole('seller'), uploadStoreImages.fields([
    { name: 'banner', maxCount: 1 },
    { name: 'logo', maxCount: 1 }
]), async (req, res) => {
    try {
        const { bio, name, location } = req.body;
        const bannerUrl = req.files?.banner?.[0]?.path || null;
        const logoUrl   = req.files?.logo?.[0]?.path || null;

        if (bio === undefined && name === undefined && location === undefined && !bannerUrl && !logoUrl) {
            return errorResponse(res, 'No data has been updated.', 400);
        }

        const fields = [];
        const values = [];
        if (bio !== undefined) { fields.push('bio = ?'); values.push(bio); }
        if (name !== undefined) { fields.push('name = ?'); values.push(name); }
        if (location !== undefined) { fields.push('location = ?'); values.push(location); }
        if (bannerUrl) { fields.push('banner_url = ?'); values.push(bannerUrl); }
        if (logoUrl) { fields.push('logo_url = ?'); values.push(logoUrl); }
        values.push(req.user.id);

        const [result] = await db.query(
            `UPDATE stores SET ${fields.join(', ')} WHERE seller_id = ?`,
            values
        );
        if (!result.affectedRows) {
            return errorResponse(res, 'The store is not yet registered. Please open the store profile page before editing.', 404);
        }

        const [rows] = await db.query(
            `SELECT s.*, u.username FROM stores s JOIN users u ON s.seller_id = u.id WHERE s.seller_id = ?`,
            [req.user.id]
        );
        return successResponse(res, 'Store profile successfully updated.', { store: rows[0] });
    } catch (err) {
        console.error('updateStore error:', err);
        return errorResponse(res, 'Server error.', 500);
    }
});

router.get('/:sellerId', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT s.*, u.username FROM stores s
             JOIN users u ON s.seller_id = u.id
             WHERE s.seller_id = ?`,
            [req.params.sellerId]
        );

        if (!rows.length) {
            const [userRows] = await db.query(
                'SELECT id, username FROM users WHERE id = ? AND role = \'seller\'',
                [req.params.sellerId]
            );
            if (!userRows.length) return res.status(404).json({ message: 'Seller not found.' });

            await db.query(
                'INSERT INTO stores (seller_id, name, member_since) VALUES (?, ?, CURDATE())',
                [req.params.sellerId, userRows[0].username]
            );

            const [newRows] = await db.query(
                'SELECT s.*, u.username FROM stores s JOIN users u ON s.seller_id = u.id WHERE s.seller_id = ?',
                [req.params.sellerId]
            );
            return res.status(200).json({ store: newRows[0] });
        }

        return res.status(200).json({ store: rows[0] });
    } catch (err) {
        console.error('getStore error:', err);
        return res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router;