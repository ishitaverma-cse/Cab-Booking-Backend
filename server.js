import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import supabase from './config/supabase.js'
import userRoutes from './routes/userRoutes.js'
import rideRoutes from './routes/rideRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import { clerkMiddleware, getAuth } from '@clerk/express'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL,
]

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests without an Origin header
            // and requests from approved frontend URLs.
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true)
            }

            return callback(new Error('Not allowed by CORS'))
        },
    })
)
app.use(express.json())
app.use(clerkMiddleware())

// Routes
app.use('/api/users', userRoutes)
app.use('/api/rides', rideRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/payments', paymentRoutes)

// Test route
app.get('/', (req, res) => {
    res.json({
        message: 'Cab Booking Backend is running successfully! 🚕',
    })
})

// Supabase connection test — returns no user data
app.get('/api/test-supabase', async (req, res) => {
    try {
        const { error } = await supabase
            .from('users')
            .select('id')
            .limit(1)

        if (error) {
            console.error('Supabase health check failed:', error.message)

            return res.status(500).json({
                success: false,
                message: 'Supabase connection check failed.',
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Supabase connection successful!',
        })
    } catch (error) {
        console.error('Supabase health check error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Supabase connection check failed.',
        })
    }
})


// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})