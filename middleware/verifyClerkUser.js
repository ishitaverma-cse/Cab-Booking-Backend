
import { getAuth } from '@clerk/express'

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

export default verifyClerkUser
