import express from 'express';
const router = express.Router();

// Test endpoint
router.get('/home/:page?', (req, res) => {
  res.json({ status: "success", message: "Donghua API ready" });
});

export default router;
