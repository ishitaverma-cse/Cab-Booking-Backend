
import express from 'express'
import { getAuth } from '@clerk/express'

import {
    getNotifications,
    markNotificationRead,
    deleteNotification,
    clearNotifications,
} from '../controllers/notificationController.js'

const router = express.Router()

const verifyClerkUser = (req, res, next) => {
    const { userId } = getAuth(req)

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
        })
    }

    req.clerkUserId = userId
    next()
}

router.use(verifyClerkUser)

router.get('/', getNotifications)
router.patch('/:notificationId/read', markNotificationRead)
router.delete('/:notificationId', deleteNotification)
router.delete('/', clearNotifications)

export default router
