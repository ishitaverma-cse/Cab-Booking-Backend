import express from 'express'
import { getAuth } from '@clerk/express'
import {
    getPayments,
    createPayment,
    createRazorpayOrder,
    verifyRazorpayPayment,
} from '../controllers/paymentController.js'

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

router.get('/', getPayments)
router.post('/', createPayment)
router.post('/create-order', createRazorpayOrder)
router.post('/verify', verifyRazorpayPayment)

export default router
