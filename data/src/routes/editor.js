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
            questions: []
        });

        // await req.app.locals.db.models.Passcode.create({
        //     examId: exam.id,
        //     code: passwordMan.genPasscode(),
        //     expiredAt: moment(exam.date).add(1, 'days').toDate()
        // });

        // return res.send(exam)
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

router.get('/editor/:examId/share', middlewares.guardRoute(['update_exam']), middlewares.getExam(), async (req, res, next) => {
    try {
        let exam = res.exam
        let passcodes = await req.app.locals.db.models.Passcode.findAll({
            where: {
                examId: exam.id
            },
            ...{
                raw: true
            }
        })

        passcodes = passcodes.map(o => {
            o.expired = moment().isSameOrAfter(moment(o.expiredAt))
            return o
        })
        let data = {
            exam: exam,
            passcodes: passcodes,
        }

        // return res.send(data)
        res.render('editor/share.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/editor/:examId/share', middlewares.guardRoute(['update_exam']), middlewares.getExam(), async (req, res, next) => {
    try {
        let exam = res.exam

        let data = {
            exam: exam,
        }

        await req.app.locals.db.models.Passcode.create({
            examId: exam.id,
            code: passwordMan.genPasscode(),
            expiredAt: moment(exam.date).add(1, 'days').toDate()
        });

        // return res.send(data)
        // res.render('editor/share.html', data);
        res.redirect(`/editor/${exam.id}/share`)
    } catch (err) {
        next(err);
    }
});
router.post('/editor/generate-passcode', middlewares.guardRoute(['update_exam']), middlewares.antiCsrfCheck, async (req, res, next) => {
    try {
        let passcode = await req.app.locals.db.models.Passcode.create({
            examId: req.body.examId,
            code: passwordMan.genPasscode(),
            expiredAt: moment().add(1, 'days').toDate()
        });
        res.send(passcode)
    } catch (err) {
        next(err);
    }
});
router.post('/editor/delete-passcode', middlewares.guardRoute(['update_exam']), middlewares.antiCsrfCheck, async (req, res, next) => {
    try {
        await req.app.locals.db.models.Passcode.destroy({
            where: {
                id: req.body.passcodeId
            }
        });
        res.send({})
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

router.get('/editor/:examId/administer', middlewares.guardRoute(['update_exam']), middlewares.getExam(), async (req, res, next) => {
    try {
        let exam = res.exam
        let passcodes = await req.app.locals.db.models.Passcode.findAll({
            where: {
                examId: exam.id
            },
            ...{
                raw: true
            }
        })

        passcodes = passcodes.map(o => {
            o.expired = moment().isSameOrAfter(moment(o.expiredAt))
            return o
        })

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
            passcodes: passcodes,
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

        if(data.examinees){
            try {
                data.examinees = JSON.parse(data.examinees)
            } catch(e) {
                data.examinees = []
            }
        }
        let examSession = await req.app.locals.db.models.ExamSession.create({
            ...data,
            status: 0,
            examId: exam.id
        });
        // res.send(examSession)
        // // await req.app.locals.db.models.Passcode.create({
        // //     examId: exam.id,
        // //     code: passwordMan.genPasscode(),
        // //     expiredAt: moment(exam.date).add(1, 'days').toDate()
        // // });

        // // return res.send(exam)
        flash.ok(req, 'exam', 'New exam session started.')
        res.redirect(`/editor/exam-session/${examSession.id}/update`)
    } catch (err) {
        next(err);
    }
});
router.get('/editor/exam-session/:examSessionId/update', middlewares.guardRoute(['update_exam']),  async (req, res, next) => {
    try {
        let examSession = await req.app.locals.db.models.ExamSession.findOne({
            where: {
                id: req.params.examSessionId,
            },
        })
        if(!examSession){
            throw new Error('aa')
        }
        let exam = await req.app.locals.db.models.Exam.findOne({
            where: {
                id: examSession.examId,
            },
        })
        if(!examSession){
            throw new Error('bb')
        }
        const wifiName = require('wifi-name')
        let data = {
            exam: exam,
            examSession: examSession,
            wifiName: wifiName.sync(),
            connections: network.connections(CONFIG.app.port),
        }

        // return res.send(data)
        res.render('editor/exam-session/preside.html', data);
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