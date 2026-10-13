import express from 'express'
import { getAuth } from '@clerk/express'
import { getRides, createRide } from '../controllers/rideController.js'
import supabase from '../config/supabase.js'


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

router.get('/', verifyClerkUser, getRides)
router.post('/', verifyClerkUser, createRide)


router.get('/stream', verifyClerkUser, async (req, res) => {
    let channel

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', req.clerkUserId)
            .maybeSingle()

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Unable to verify your user profile.',
            })
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found.',
            })
        }

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
        res.flushHeaders?.()

        res.write('event: connected\ndata: {"connected":true}\n\n')

        channel = supabase
            .channel(`ride-updates-${user.id}-${Date.now()}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'rides',
                    filter: `user_id=eq.${user.id}`,
                },
                payload => {
                    if (res.writableEnded || res.destroyed) return

                    res.write(
                        `event: ride_status\ndata: ${JSON.stringify(payload.new)}\n\n`
                    )
                }
            )
            .subscribe(status => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    if (!res.writableEnded && !res.destroyed) {
                        res.write(
                            'event: stream_error\ndata: {"message":"Realtime connection interrupted."}\n\n'
                        )
                    }
                }
            })

        const heartbeat = setInterval(() => {
            if (!res.writableEnded && !res.destroyed) {
                res.write(': heartbeat\n\n')
            }
        }, 25000)

        const cleanup = () => {
            clearInterval(heartbeat)

            if (channel) {
                supabase.removeChannel(channel).catch(() => { })
                channel = null
            }
        }

        req.on('close', cleanup)
        res.on('close', cleanup)
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Unable to start ride updates.',
            })
        } else if (!res.writableEnded && !res.destroyed) {
            res.end()
        }

        if (channel) {
            await supabase.removeChannel(channel).catch(() => { })
        }
    }
})


export default router
