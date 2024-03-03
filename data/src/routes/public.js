//// Core modules
let { timingSafeEqual } = require('crypto')

//// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')

//// Modules
const flash = require('../kisapmata')
const passwordMan = require('../password-man')

// Router
let router = express.Router()

router.get('/', async (req, res, next) => {
    try {
        res.render('home.html');
    } catch (err) {
        next(err);
    }
});

router.get('/login', async (req, res, next) => {
    try {
        if (lodash.get(req, 'session.authUserId')) {
            return res.redirect(`/editor/all`)
        }
        res.render('login.html', {
            flash: flash.get(req, 'login'),
            username: lodash.get(req, 'query.username', ''),
        });
    } catch (err) {
        next(err);
    }
});
router.post('/login', async (req, res, next) => {
    try {
        if (CONFIG.loginDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.loginDelay)) // Rate limit 
        }

        let post = req.body;

        let username = lodash.get(post, 'username', '');
        let password = lodash.trim(lodash.get(post, 'password', ''))

        // Find admin
        let user = await req.app.locals.db.models.User.findOne({ where: { username: username } })
        if (!user) {
            throw new Error('Incorrect username.')
        }

        if (!user.active) {
            throw new Error('Your account is deactivated.');
        }

        // Check password
        let passwordHash = passwordMan.hashPassword(password, user.salt);
        if (!timingSafeEqual(Buffer.from(passwordHash, 'utf8'), Buffer.from(user.passwordHash, 'utf8'))) {
            flash.error(req, 'login', 'Incorrect password.');
            return res.redirect(`/login?username=${username}`);
        }

        // Save user id to session
        lodash.set(req, 'session.authUserId', user.id);

        // Security: Anti-CSRF token.
        let antiCsrfToken = await passwordMan.randomStringAsync(16)
        lodash.set(req, 'session.acsrf', antiCsrfToken);

        return res.redirect('/editor/all');
    } catch (err) {
        console.error(err)
        flash.error(req, 'login', err.message);
        return res.redirect('/login');
    }
});

router.get('/logout', async (req, res, next) => {
    try {
        lodash.set(req, 'session.authUserId', null);
        lodash.set(req, 'session.authPasscodeId', null);
        lodash.set(req, 'session.acsrf', null);
        lodash.set(req, 'session.flash', null);
        res.clearCookie(CONFIG.session.name, CONFIG.session.cookie);

        res.redirect('/');
    } catch (err) {
        next(err);
    }
});

// router.get('/exam', async (req, res, next) => {
//     try {

//         res.render('exam.html', {
//             flash: flash.get(req, 'entrance'),
//             passcode: req.query.passcode,
//         });
//     } catch (err) {
//         next(err);
//     }
// });

router.get('/get-exam/:passcode', async (req, res, next) => {
    try {
        if (CONFIG.loginDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.loginDelay)) // Rate limit 
        }

        // Logout 
        lodash.set(req, 'session.authUserId', null);
        lodash.set(req, 'session.authPasscodeId', null);
        lodash.set(req, 'session.acsrf', null);
        lodash.set(req, 'session.flash', null);

        // Find 
        let examSession = await req.app.locals.db.models.ExamSession.findOne({ 
            where: { 
                passcode: req.params.passcode,
            } 
        })
        if (!examSession) {
            throw new Error('Wrong passcode.')
        }

        if (examSession.status === 2) {
            throw new Error('Exam has ended.');
        }

        // Save user id to session
        lodash.set(req, 'session.authPasscodeId', examSession.passcode);

        // Security: Anti-CSRF token.
        let antiCsrfToken = await passwordMan.randomStringAsync(16)
        lodash.set(req, 'session.acsrf', antiCsrfToken);

        return res.redirect(`/view/${examSession.id}`);
    } catch (err) {
        console.error(err)
        flash.error(req, 'entrance', err.message);
        return res.redirect('/');
    }
});

module.exports = router;