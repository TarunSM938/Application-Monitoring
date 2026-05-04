const express = require('express');
const {
  okDemo,
  slowDemo,
  serverErrorDemo,
  badJsonDemo,
} = require('../controllers/demoController');

const router = express.Router();

router.get('/ok', okDemo);
router.get('/slow', slowDemo);
router.get('/error', serverErrorDemo);
router.get('/bad-json', badJsonDemo);

module.exports = router;
