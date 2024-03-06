
//// Core modules

//// External modules
const access = require('acrb')
const lodash = require('lodash')

//// Modules
// const uploader = require('./uploader')

module.exports = {
    rateLimit: async (req, res, next) => {
        try {
            if (ENV !== 'dev') await new Promise(resolve => setTimeout(resolve, 5000)) // Rate limit if on live 
            next();
        } catch (err) {
            next(err)
        }
    },
    allowIp: async (req, res, next) => {
        try {
            if (CONFIG.ipCheck === false) {
                return next();
            }

            let ips = await req.app.locals.db.models.AllowedIP.findAll(); // Get from db
            let allowed = lodash.map(ips, (ip) => { // Simplify
                return ip.address;
            })

            if (allowed.length <= 0) { // If none from db, get from config
                allowed = CONFIG.ip.allowed;
            }
            let ip = req.headers['x-real-ip'] || req.connection.remoteAddress;

            if (allowed.includes(ip) || allowed.length <= 0) {
                return next();
            }
            res.setHeader('X-IP', ip);
            res.status(400).send('Access denied from ' + ip)
        } catch (err) {
            next(err);
        }
    },
    antiCsrfCheck: async (req, res, next) => {
        try {
            let acsrf = lodash.get(req, 'body.acsrf')

            if (lodash.get(req, 'session.acsrf') === acsrf) {
                return next();
            }
            throw new Error(`Anti-CSRF error detected.`)
        } catch (err) {
            next(err);
        }
    },
    guardRoute: (permissions, condition = 'and') => {
        return async (req, res, next) => {
            try {
                let user = res.user
                let rolesList = await req.app.locals.db.models.Role.findAll()
                if (condition === 'or') {
                    if (!access.or(user, permissions, rolesList)) {
                        return res.render('error.html', {
                            error: `Access denied. Must have one of these permissions: ${permissions.join(', ')}.`
                        })
                    }
                } else {
                    if (!access.and(user, permissions, rolesList)) {
                        return res.render('error.html', {
                            error: `Access denied. Required all these permissions: ${permissions.join(', ')}.`
                        })
                    }
                }
                next()
            } catch (err) {
                next(err)
            }
        }
    },
    getExam: (options = {}) => {
        return async (req, res, next) => {
            try {
                let authUserId = lodash.get(req, 'session.authUserId')
                let authPasscodeId = lodash.get(req, 'session.authPasscodeId')
                let exam = null
                if (authUserId) {
                    let user = await req.app.locals.db.models.User.findOne({
                        where: {
                            id: authUserId
                        }
                    })
                    if (!user) throw new Error('User not found.')
                    exam = await req.app.locals.db.models.Exam.findOne({
                        where: {
                            id: req.params.examId
                        },
                        ...options
                    })
                } else if (authPasscodeId) {
                    let passcode = await req.app.locals.db.models.Passcode.findOne({
                        where: {
                            id: authPasscodeId
                        }
                    })
                    if (!passcode) throw new Error('Passcode not found.')
                    if (req.params.examId != passcode.examId) throw new Error('Not allowed.')

                    exam = await req.app.locals.db.models.Exam.findOne({
                        where: {
                            id: passcode.examId
                        },
                        ...options
                    })
                }

                if (!exam) throw new Error('Exam not found.')

                res.exam = exam

                next()
            } catch (err) {
                next(err)
            }
        }
    },
    getExamSession: (options = {}) => {
        return async (req, res, next) => {
            try {
                let authPasscodeId = lodash.get(req, 'session.authPasscodeId')
                let examSession = await req.app.locals.db.models.ExamSession.findOne({
                    where: {
                        id: req.params.examSessionId,
                        passcode: authPasscodeId
                    },
                    ...options
                })
                if (!examSession) throw new Error('Not allowed.')

                if (!examSession.status === 2) throw new Error('Exam has ended.')

                let exam = await req.app.locals.db.models.Exam.findOne({
                    where: {
                        id: examSession.examId
                    },
                    ...options
                })

                res.examSession = examSession
                res.exam = exam

                next()
            } catch (err) {
                next(err)
            }
        }
    },
    getUser: async (req, res, next) => {
        try {
            let userId = req.params.userId || ''
            let user = await req.app.locals.db.models.User.findByPk(userId);
            if (!user) {
                return res.render('error.html', { error: "Sorry, user not found." })
            }
            res.user = user
            next();
        } catch (err) {
            next(err);
        }
    },
    dataUrlToReqFiles: (names = []) => {
        return async (req, res, next) => {
            try {

                names.forEach((fieldName) => {
                    let fieldValue = lodash.get(req, `body.${fieldName}`)
                    if (fieldValue) {
                        lodash.set(req, `files.${fieldName}`, [
                            uploader.toReqFile(fieldValue)
                        ])
                    }
                })

                next()
            } catch (err) {
                next(err)
            }
        }
    },
    handleExpressUploadMagic: async (req, res, next) => {
        try {
            let files = lodash.get(req, 'files', [])
            let localFiles = await uploader.handleExpressUploadLocalAsync(files, CONFIG.app.dirs.upload)
            let imageVariants = await uploader.resizeImagesAsync(localFiles, null, CONFIG.app.dirs.upload); // Resize uploaded images

            let uploadList = uploader.generateUploadList(imageVariants, localFiles)
            let saveList = uploader.generateSaveList(imageVariants, localFiles)
            await uploader.uploadToS3Async(uploadList)
            await uploader.deleteUploadsAsync(localFiles, imageVariants)
            req.localFiles = localFiles
            req.imageVariants = imageVariants
            req.saveList = saveList
            next()
        } catch (err) {
            next(err)
        }
    },
    handleUpload: (o) => {
        return async (req, res, next) => {
            try {
                let files = lodash.get(req, 'files', [])
                let localFiles = await uploader.handleExpressUploadLocalAsync(files, CONFIG.app.dirs.upload, o.allowedMimes)
                let imageVariants = await uploader.resizeImagesAsync(localFiles, null, CONFIG.app.dirs.upload); // Resize uploaded images

                let uploadList = uploader.generateUploadList(imageVariants, localFiles)
                let saveList = uploader.generateSaveList(imageVariants, localFiles)
                await uploader.uploadToS3Async(uploadList)
                await uploader.deleteUploadsAsync(localFiles, imageVariants)
                req.localFiles = localFiles
                req.imageVariants = imageVariants
                req.saveList = saveList
                next()
            } catch (err) {
                next(err)
            }
        }
    },
    requireAuthUser: async (req, res, next) => {
        try {
            let authUserId = lodash.get(req, 'session.authUserId')
            if (!authUserId) {
                return res.redirect('/')
            }
            let user = await req.app.locals.db.models.User.findOne({
                where: {
                    id: authUserId
                },
            })

            if (!user) {
                return res.redirect('/logout') // Prevent redirect loop when user is null
            }
            if (!user.active) {
                return res.redirect('/logout')
            }
            res.user = user
            next()
        } catch (err) {
            next(err)
        }
    },
    requireAuthViewer: async (req, res, next) => {
        try {
            let authUserId = lodash.get(req, 'session.authUserId') // User login
            let authPasscodeId = lodash.get(req, 'session.authPasscodeId') // Passcode

            if (!authUserId && !authPasscodeId) {
                return res.redirect('/')
            }

            next()
        } catch (err) {
            next(err)
        }
    },
    /**
     * See: https://expressjs.com/en/api.html#app.locals
     * See: https://expressjs.com/en/api.html#req.app
     * 
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    perAppViewVars: function (req, res, next) {
        req.app.locals.app = {
            title: CONFIG.app.title,
            description: CONFIG.description,
        }
        req.app.locals.CONFIG = lodash.cloneDeep(CONFIG) // Config
        req.app.locals.ENV = ENV
        req.app.locals.VERSION = `2023.11`
        req.app.locals.SERVER_URL = CONFIG.app.url,
            next()
    },
    /**
     * See: https://expressjs.com/en/api.html#res.locals
     * 
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    perRequestViewVars: async (req, res, next) => {
        try {
            res.locals.user = null
            let authUserId = lodash.get(req, 'session.authUserId');
            if (authUserId) {
                let user = await req.app.locals.db.models.User.findByPk(authUserId)
                if (user) {
                    user = user.toJSON() // Plain object
                    user = lodash.pickBy(user, (_, key) => {
                        return !['createdAt', 'updatedAt', '__v', 'passwordHash', 'salt'].includes(key) // Remove these props
                    })
                }
                res.locals.user = user
            }

            res.locals.acsrf = lodash.get(req, 'session.acsrf');

            res.locals.url = req.url
            res.locals.urlPath = req.path
            res.locals.query = req.query

            let bodyClass = 'page' + (req.baseUrl + req.path).replace(/\//g, '-');
            bodyClass = lodash.trim(bodyClass, '-');
            bodyClass = lodash.trimEnd(bodyClass, '.html');
            res.locals.bodyClass = bodyClass; // global body class css

            res.locals.hideNav = lodash.get(req, 'cookies.hideNav', 'true')

            next();
        } catch (error) {
            next(error);
        }
    },
    saneTitles: async (req, res, next) => {
        try {
            if (!res.locals.title && !req.xhr) {
                let title = lodash.trim(req.originalUrl.split('/').join(' '));
                title = lodash.trim(title.replace('-', ' '));
                let words = lodash.map(title.split(' '), (word) => {
                    return lodash.capitalize(word);
                })
                title = words.join(' - ')
                if (title) {
                    res.locals.title = `${title} | ${req.app.locals.app.title} `;
                }
            }
            next();
        } catch (error) {
            next(error);
        }
    },
    socket: {
        expressToSocketMiddleware: (middleware) => {
            return (socket, next) => {
                return middleware(socket.request, {}, next)
            }
        },
        authByPasscode: (socket, next) => {
            let authUserId = lodash.get(socket, 'request.session.authPasscodeId');
            if (!authUserId) {
                next(new Error("Unauthorized"));
            } else {
                next()
            }
        },
        authByPassword: (socket, next) => {
            let authUserId = lodash.get(socket, 'request.session.authUserId');
            if (!authUserId) {
                next(new Error("Unauthorized"));
            } else {
                next()
            }
        },
        onQuizConnect: (io, app) => {
            return async (socketInstance) => {
        //         const socketInstances = await io.of('/quiz').fetchSockets()
        // console.log(socketInstances.length)

                let room = lodash.get(socketInstance, 'handshake.query.room')
                let examSessionId = lodash.get(socketInstance, 'handshake.query.examSessionId')
                let examineeId = lodash.get(socketInstance, 'handshake.auth.token')
                // console.log('CONNECT', 'examSessionId', examSessionId, socketInstance.id, examineeId, 'count', io.of("/quiz").sockets.size)

                if (room) {
                    socketInstance.join(room)
                }

                if (examineeId) {
                    // console.log('CONNECT', examineeId)
                    let examinees = lodash.get(app, `locals.ioClients.room${examSessionId}`, [])
                    examinees.push(examineeId)
                    lodash.set(app, `locals.ioClients.room${examSessionId}`, examinees)
                  
                    io.of("/quiz").to(room).emit("addExamineeList", examineeId);
                    io.of("/proctor").to(room).emit("addExamineeList", examineeId);
                }


                socketInstance.on("disconnect", (reason) => {
                    // console.log('DISCO', 'examSessionId', examSessionId, socketInstance.id, examineeId)
                    if (examineeId) {
                        console.log('DISCO', examineeId)
                        let examinees = lodash.get(app, `locals.ioClients.room${examSessionId}`, [])
                        let index = examinees.indexOf(examineeId)
                        if (index > -1) {
                            examinees.splice(index,1)
                            lodash.set(app, `locals.ioClients.room${examSessionId}`, examinees)
                        }
                        io.of("/quiz").to(room).emit("reduceExamineeList", examineeId);
                        io.of("/proctor").to(room).emit("reduceExamineeList", examineeId);
                    }
                })

                // socketInstance.on("proctor administer", (arg) => {
                //     console.log('proctor administer', arg);
                // })

                // socketInstance.on("fullScreen", (arg) => {
                //     console.log('fullScreen', arg);
                // })

                socketInstance.on("student ready", (arg) => {
                    console.log('student ready', arg, socketInstance.id);
                    // app.locals.ioClients.push(room)
                    io.of("/quiz").to(room).emit("hello", arg.firstname);
                })
            }
        },
        onProctorConnect: (io, app) => {
            return (socketInstance) => {
                let room = lodash.get(socketInstance, 'handshake.query.room')
                let examSessionId = lodash.get(socketInstance, 'handshake.query.examSessionId')
                let examineeId = lodash.get(socketInstance, 'handshake.auth.token')
                console.log('proctor CONNECT', 'examSessionId', examSessionId, socketInstance.id, examineeId)

                // console.log(app.locals.ioClients)
                if (room) {
                    // console.log(`socketInstance ${socketInstance.id} to room ${room}`)
                    socketInstance.join(room)
                }

                socketInstance.on("disconnect", (reason) => {
                    // console.log('disconnect', reason)
                    console.log('proctor DISCO', 'examSessionId', examSessionId, socketInstance.id, examineeId)
                })

                socketInstance.on("proctor administer", (arg) => {
                    // console.log('proctor administer', arg);
                })

                socketInstance.on("fullScreen", (arg) => {
                    console.log('fullScreen', arg);
                })

                socketInstance.on("go", (arg) => {
                    io.of("/quiz").to(room).emit("start");
                })
                socketInstance.on("end", (arg) => {
                    io.of("/quiz").to(room).emit("end");
                })
            }
        }
    }
}