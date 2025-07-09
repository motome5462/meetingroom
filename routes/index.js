var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  const selectedDate = req.query.date || null;
  res.render('schedule', { title: 'schedule', selectedDate });
});

router.get('/insert', function(req, res, next) {
  res.render('insert', { title: 'insert' });
});

router.get('/schedule/display', function(req, res, next) {
  res.render('display', { title: 'display' });
});

router.get('/schedule/monthly', function(req, res, next) {
  res.render('monthly', { title: 'monthly' });
});
module.exports = router;
