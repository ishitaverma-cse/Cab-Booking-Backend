import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import supabase from './config/supabase.js'
import userRoutes from './routes/userRoutes.js'
import rideRoutes from './routes/rideRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())


// Routes
app.use('/api/users', userRoutes)
app.use('/api/rides', rideRoutes)
app.use('/api/payments', paymentRoutes)

// Test route
app.get('/', (req, res) => {
    res.json({
        message: 'Cab Booking Backend is running successfully! 🚕',
    })
})


// Supabase test route
app.get('/api/test-supabase', async (req, res) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1)

    if (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        })
    }

    res.json({
        success: true,
        message: 'Supabase connection successful! 🚕',
        data,
    })
})

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})