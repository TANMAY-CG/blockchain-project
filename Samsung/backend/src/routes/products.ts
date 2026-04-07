import { Router } from 'express';
import { Product } from '../models/Product';

export const productsRouter = Router();

// Fetch product by productId (for barcode scanning flow)
productsRouter.get('/:productId', async (req, res) => {
  const productId = req.params.productId;
  const product = await Product.findOne({ productId }).lean();
  if (!product) return res.status(404).json({ message: 'invalid product ID entered' });
  return res.json(product);
});

