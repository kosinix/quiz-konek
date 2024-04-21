//// Core modules

//// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')

//// Modules
const flash = require('../kisapmata')
const middlewares = require('../middlewares')
const passwordMan = require('../password-man')
const network = require('../network')
const uniqueId = (length = 8) => {
    return parseInt(Math.ceil(Math.random() * Date.now()).toPrecision(length).toString().replace(".", ""))
}
// Router
let router = express.Router()

router.use('/editor', middlewares.requireAuthUser)

router.get('/editor/:examId/tell4', middlewares.guardRoute(['update_exam']), middlewares.getExam(), async (req, res, next) => {
    try {
        req.app.locals.io.of('/quiz').to('exam-1').emit("updateUi", {
            page: 4
        });
        res.send('ok')
    } catch (err) {
        next(err);
    }
});
router.get('/editor/:examId/tell1', middlewares.guardRoute(['update_exam']), middlewares.getExam(), async (req, res, next) => {
    try {
        req.app.locals.io.of('/quiz').to('exam-1').emit("updateUi", {
            page: 1
        });
        res.send('ok')
    } catch (err) {
        next(err);
    }
});

router.get('/editor/all', middlewares.guardRoute(['read_all_exam']), async (req, res, next) => {
    try {
        let exams = await req.app.locals.db.models.Exam.findAll({
            order: [
                ['createdAt', 'DESC'],
            ]
        })
        let data = {
            flash: flash.get(req, 'exam'),
            exams: exams,
        }
        res.render('editor/all.html', data);
    } catch (err) {
        next(err);
    }
});

router.get('/editor/create', middlewares.guardRoute(['create_exam']), async (req, res, next) => {
    try {
        res.render('editor/create.html');
    } catch (err) {
        next(err);
    }
});
router.post('/editor/create', middlewares.guardRoute(['create_exam']), middlewares.antiCsrfCheck, async (req, res, next) => {
    try {
        let data = req.body

        let exam = await req.app.locals.db.models.Exam.create({
            title: data.title,
            questions: [],
            results: []
        });

        return res.send(exam)
        flash.ok(req, 'exam', 'Exam created.')
        res.redirect(`/editor/${exam.id}/update`)
    } catch (err) {
        next(err);
    }
});

router.get('/editor/:examId/update', middlewares.guardRoute(['update_exam']), middlewares.getExam(), async (req, res, next) => {
    try {
        let exam = res.exam

        let data = {
            flash: flash.get(req, 'exam'),
            SOCKET_URL: `//${req.headers['host']}`,
            exam: exam,
        }
        // return res.send(data)
        res.render('editor/update.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/editor/:examId/update', middlewares.guardRoute(['update_exam']), middlewares.antiCsrfCheck, middlewares.getExam(), async (req, res, next) => {
    try {
        let exam = res.exam

        let data = req.body
        // return res.send(data)
        exam.set({
            questions: data.questions
        });
        await exam.save()

        if (req.xhr) {
            return res.send(data)
        }
        res.redirect(`/editor/${exam.id}/update`)
    } catch (err) {
        next(err);
    }
});

router.get('/editor/:examId/update-details', middlewares.guardRoute(['update_exam']), middlewares.getExam(), async (req, res, next) => {
    try {
        let exam = res.exam
        let data = {
            exam: exam,
        }
        // return res.send(data)
        res.render('editor/update-details.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/editor/:examId/update-details', middlewares.guardRoute(['update_exam']), middlewares.antiCsrfCheck, middlewares.getExam(), async (req, res, next) => {
    try {
        let exam = res.exam

        let payload = req.body
        // return res.send(data)
        exam.set({
            title: payload.exam.title,
        });
        await exam.save()

        // return res.send(req.body)
        res.send(exam)
    } catch (err) {
        next(err);
    }
});

router.get('/editor/:examId/delete', middlewares.guardRoute(['delete_exam']), middlewares.getExam(), async (req, res, next) => {
    try {
        let exam = res.exam

        let data = {
            exam: exam,
        }
        // return res.send(data)
        res.render('editor/delete.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/editor/:examId/delete', middlewares.guardRoute(['delete_exam']), middlewares.antiCsrfCheck, async (req, res, next) => {
    try {
        let exam = await req.app.locals.db.models.Exam.findOne({
            where: {
                id: req.params.examId
            },
        })
        if (!exam) throw new Error('Exam not found.')

        await req.app.locals.db.models.Passcode.destroy({
            where: {
                examId: exam.id
            }
        });

        await exam.destroy();

        flash.ok(req, 'exam', 'Exam deleted.')
        res.redirect(`/editor/all`)
    } catch (err) {
        next(err);
    }
});

router.get('/editor/:examId/sessions', middlewares.guardRoute(['update_exam']), middlewares.getExam(), async (req, res, next) => {
    try {
        let exam = res.exam

        let examSessions = await req.app.locals.db.models.ExamSession.findAll({
            where: {
                examId: exam.id
            }
        })
        let data = {
            exam: exam,
            examSessions: examSessions,
            flash: flash.get(req, 'exam'),

        }

        // return res.send(examSessions)
        res.render('editor/exam-session/sessions.html', data);
    } catch (err) {
        next(err);
    }
});

router.get('/editor/:examId/administer', middlewares.guardRoute(['update_exam']), middlewares.getExam(), async (req, res, next) => {
    try {
        let exam = res.exam

        let examSession = {
            examinees: [],
            description: '',
            venue: '',
            date: moment().format('YYYY-MM-DD HH:mm'),
            passcode: passwordMan.genPasscode(),
        }
        let data = {
            exam: exam,
            examSession: examSession,
        }

        // return res.send(data)
        res.render('editor/administer.html', data);
    } catch (err) {
        next(err);
    }
});


router.post('/editor/:examId/administer', middlewares.guardRoute(['update_exam']), middlewares.getExam(), middlewares.antiCsrfCheck, async (req, res, next) => {
    try {
        let exam = res.exam

        let data = req.body

        if (data.examinees) {
            try {
                data.examinees = JSON.parse(data.examinees)
            } catch (e) {
                data.examinees = []
            }
        }
        let examSession = await req.app.locals.db.models.ExamSession.create({
            ...data,
            status: 0,
            examId: exam.id,
            results: []
        });
        // return res.send(examSession)
        // // await req.app.locals.db.models.Passcode.create({
        // //     examId: exam.id,
        // //     code: passwordMan.genPasscode(),
        // //     expiredAt: moment(exam.date).add(1, 'days').toDate()
        // // });

        // // return res.send(exam)
        flash.ok(req, 'exam', 'New exam session started.')
        res.redirect(`/editor/${exam.id}/session/${examSession.id}`)
    } catch (err) {
        next(err);
    }
});
router.get('/editor/:examId/session/:examSessionId', middlewares.guardRoute(['update_exam']), async (req, res, next) => {
    try {
        let examSession = await req.app.locals.db.models.ExamSession.findOne({
            where: {
                id: req.params.examSessionId,
            },
        })
        if (!examSession) {
            throw new Error('Exam Session not found.')
        }
        let exam = await req.app.locals.db.models.Exam.findOne({
            where: {
                id: examSession.examId,
            },
        })
        if (!examSession) {
            throw new Error('bb')
        }
        const wifiName = require('wifi-name')
        let examinees = lodash.get(req, `app.locals.ioClients.room${examSession.id}`, [])
        examSession.examinees = examSession.examinees.map(e => {
            // e.status = 0
            if(examinees.includes(e.id)){
                e.status = 1
            }
            return e
        })
        // console.log(lodash.get(req, `app.locals.ioClients.room${examSession.passcode}`))
        let data = {
            exam: exam,
            examSession: examSession,
            examinees: examSession.examinees,
            wifiName: wifiName.sync(),
            connections: network.connections(CONFIG.app.port),
        }

        // return res.send(data)
        res.render('editor/exam-session/preside.html', data);
    } catch (err) {
        next(err);
    }
});
router.get('/editor/:examId/session/:examSessionId/delete', middlewares.guardRoute(['update_exam']), async (req, res, next) => {
    try {
        let examSession = await req.app.locals.db.models.ExamSession.findOne({
            where: {
                id: req.params.examSessionId,
            },
        })
        if (!examSession) {
            throw new Error('Exam Session not found.')
        }
        let exam = await req.app.locals.db.models.Exam.findOne({
            where: {
                id: examSession.examId,
            },
        })
        if (!examSession) {
            throw new Error('bb')
        }
        const wifiName = require('wifi-name')
        let examinees = lodash.get(req, `app.locals.ioClients.room${examSession.id}`, [])
        examSession.examinees = examSession.examinees.map(e => {
            // e.status = 0
            if(examinees.includes(e.id)){
                e.status = 1
            }
            return e
        })
        // console.log(lodash.get(req, `app.locals.ioClients.room${examSession.passcode}`))
        let data = {
            exam: exam,
            examSession: examSession,
            examinees: examSession.examinees,
            wifiName: wifiName.sync(),
            connections: network.connections(CONFIG.app.port),
        }

        // return res.send(data)
        res.render('editor/exam-session/delete.html', data);
    } catch (err) {
        next(err);
    }
});

router.post('/editor/:examId/session/:sessionId/delete', middlewares.guardRoute(['update_exam']), middlewares.antiCsrfCheck, async (req, res, next) => {
    try {
        let exam = await req.app.locals.db.models.Exam.findOne({
            where: {
                id: req.params.examId
            },
        })
        if (!exam) throw new Error('Exam not found.')

        let examSession = await req.app.locals.db.models.ExamSession.findOne({
            where: {
                id: req.params.sessionId,
                examId: exam.id
            },
        })
        if (!examSession) throw new Error('Exam Session not found.')

        await examSession.destroy();

        flash.ok(req, 'exam', 'Exam session deleted.')
        res.redirect(`/editor/${exam.id}/sessions`)
    } catch (err) {
        next(err);
    }
});

router.get('/editor/network', middlewares.guardRoute(['update_exam']), async (req, res, next) => {
    try {
        const { spawnSync } = require('child_process')
        const cmd = 'netsh';
        const args = ['wlan', 'show', 'interface'];
        const ls = spawnSync(cmd, args);

        let data = `${ls.stdout}`

        data = `${data}`.replace(/ +/g, ' ')
        data = `${data}`.split("\n")
        data = data.filter(d => {
            return d.includes(' SSID')
        })
        data = data.map(d => {
            d = `${d}`.trim().split(' ').at(-1)
            return d
        })
        console.log(data.pop())


        // console.log(networkInterfaces)
        res.send(ip4Addresses)
    } catch (err) {
        next(err);
    }
});




module.exports = router;