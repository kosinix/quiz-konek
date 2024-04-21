//// Core modules

//// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')

//// Core modules

//// Modules
const middlewares = require('../middlewares');

let alphabetToN = (a) => {
    let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    let index = alphabet.indexOf(a)
    return index
}
const nToAlphabet = (choiceIndex) => {
    let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    return alphabet[choiceIndex]
}

// Router
let router = express.Router()

router.use('/view', middlewares.requireAuthViewer)

router.get('/view/:examSessionId', middlewares.getExamSession(), async (req, res, next) => {
    try {
        let examSession = res.examSession
        let exam = res.exam
        exam.questions = exam.questions.map(q => {
            let choices = q.choices.map(c => {
                return {
                    id: c.id,
                    text: c.text,
                    selected: false,
                    isCorrect: c.isCorrect
                }
            })
            return {
                id: q.id,
                text: q.text,
                choices: choices,
            }
        })
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
router.post('/view/:examSessionId', middlewares.getExamSession(), async (req, res, next) => {
    try {
        let data = req.body
        let results = data

        console.log(res.examSession)
        const QUESTIONS = res.exam.questions.map(q => {
            let answers = q.choices.map(c => c.isCorrect)
            return {
                id: q.id,
                text: q.text,
                answers: answers
            }
        })

        let totalScore = 0
        results.questions = results.questions.map(q => {
            let answerKey = QUESTIONS.find(_q => {
                return q.id === _q.id
            })

            q.score = 0
            if (answerKey) {
                q.correct = answerKey.answers
                for (let x = 0; x < q.answers.length; x++) {
                    // console.log(x, q.answers[x], '===', answerKey.answers[x])
                    if (answerKey.answers[x] && answerKey.answers[x] === q.answers[x]) {
                        q.score = answerKey.points ?? 1
                        totalScore += answerKey.points ?? 1
                        break
                    }
                }

            }

            return q
        })
        results.score = totalScore

        let results2 = lodash.get(res, 'examSession.results', [])
        results2.push(results)
        // res.examSession.set({
        //     results: results2
        // });
        await req.app.locals.db.models.ExamSession.update({ results: results2 }, {
            where: {
                id: res.examSession.id
            }
        });
        // await res.examSession.save()
        // console.log(results2)
        res.send(results2)
    } catch (err) {
        next(err);
    }
})
router.get('/view2/:examSessionId', middlewares.getExamSession(), async (req, res, next) => {
    try {

        let results = {
            examinee: {
                firstName: 'Charmel Jay',
                id: 1,
                lastName: 'Angeles',
                middleName: 'E.',
                status: 0
            },
            questions: [
                {
                    id: 11734014,
                    question: 'What is the objective of learning HTML? ',
                    answer: 'B'
                },
                {
                    id: 78837325,
                    question: 'What is web development primarily about? ',
                    answer: 'B'
                },
                {
                    id: 48215908,
                    question: 'What is an attribute in an HTML tag?',
                    answer: 'C'
                }
            ]
        }






        res.send(results)
    } catch (err) {
        next(err);
    }
})

module.exports = router;