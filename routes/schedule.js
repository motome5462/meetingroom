const express = require('express');
const router = express.Router();

router.get('/dispaly', (req, res) => {
  res.render('dispaly');
});

router.get('/', (req, res) => {
  res.render('schedule');
});


module.exports = router;
