var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('schedule', { title: 'schedule' });
});

router.get('/insert', function(req, res, next) {
  res.render('insert', { title: 'insert' });
});

router.get('/schedule/display', function(req, res, next) {
  res.render('display', { title: 'schedule' });
});

module.exports = router;
