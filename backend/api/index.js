// Điểm vào cho Vercel Functions: mọi đường dẫn được rewrite về đây (xem vercel.json).
// Express app tự là một hàm (req, res) nên Vercel gọi trực tiếp.
module.exports = require('../server');
