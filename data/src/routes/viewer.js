//// Core modules

//// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')

//// Core modules

//// Modules
const middlewares = require('../middlewares');

// Router
let router = express.Router()

router.use('/view', middlewares.requireAuthViewer)

router.get('/view/:examSessionId', middlewares.getExamSession(), async (req, res, next) => {
    try {
        let examSession = res.examSession
        let exam = res.exam
        exam.time = moment(exam.time, 'hh:mm').format('hh:mm A')
        let data = {
            SOCKET_URL: `//${req.headers['host']}`,
            examSession: examSession,
            exam: exam,
        }
        // return res.send(data)
        res.render('viewer/view.html', data);
    } catch (err) {
        next(err);
    }
});


module.exports = router;