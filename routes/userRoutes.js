import express from 'express'
import {
    getUsers,
    createUser,
} from '../controllers/userController.js'
import verifyClerkUser from '../middleware/verifyClerkUser.js'

const router = express.Router()

router.get('/', verifyClerkUser, getUsers)
router.post('/', verifyClerkUser, createUser)

export default router
