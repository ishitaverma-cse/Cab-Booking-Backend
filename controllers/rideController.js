import supabase from '../config/supabase.js'
import { sendRideReceiptEmail } from '../utils/emailService.js'

export const getRides = async (req, res) => {
    try {
        const clerk_id = req.clerkUserId

        let query = supabase
            .from('rides')
            .select(
                'id, created_at, user_id, pickup_location, drop_location, ride_type, fare, status'
            )
            .order('created_at', { ascending: false })
            
        // When a Clerk ID is supplied, resolve the user's
        // Supabase UUID and return only their rides.
        if (clerk_id) {
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('clerk_id', clerk_id)
                .maybeSingle()

            if (userError) {
                return res.status(500).json({
                    success: false,
                    message: userError.message,
                })
            }

            if (!user) {
                return res.status(200).json({
                    success: true,
                    data: [],
                })
            }

            query = query.eq('user_id', user.id)
        }

        const { data, error } = await query

        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            })
        }

        return res.status(200).json({
            success: true,
            data,
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to fetch rides.',
        })
    }
}

export const createRide = async (req, res) => {
    try {
        const {
            pickup_location,
            drop_location,
            ride_type,
            fare,
        } = req.body

        const clerk_id = req.clerkUserId

        if (
            !clerk_id ||
            !pickup_location?.trim() ||
            !drop_location?.trim() ||
            !ride_type ||
            fare == null ||
            !Number.isFinite(Number(fare)) ||
            Number(fare) < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'clerk_id, pickup_location, drop_location, ride_type and a valid fare are required.',
            })
        }

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', clerk_id)
            .maybeSingle()

        if (userError) {
            return res.status(500).json({
                success: false,
                message: userError.message,
            })
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    'User profile not found. Please ensure your account is synced with the database.',
            })
        }

        const { data, error } = await supabase
            .from('rides')
            .insert({
                user_id: user.id,
                pickup_location: pickup_location.trim(),
                drop_location: drop_location.trim(),
                ride_type,
                fare: Number(fare),
                status: 'requested',
            })
            .select()
            .single()

        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            })
        }

        return res.status(201).json({
            success: true,
            message: 'Ride requested successfully!',
            data,
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to create ride.',
        })
    }
}

export const sendRideReceipt = async (req, res) => {
    try {
        const { rideId } = req.params

        // Find the logged-in user's profile.
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('clerk_id', req.clerkUserId)
            .maybeSingle()

        if (userError) throw userError

        if (!user || !user.email) {
            return res.status(404).json({
                success: false,
                message: 'User profile or registered email not found.',
            })
        }

        // Only allow the owner of the ride to request its receipt.
        const { data: ride, error: rideError } = await supabase
            .from('rides')
            .select('*')
            .eq('id', rideId)
            .eq('user_id', user.id)
            .maybeSingle()

        if (rideError) throw rideError

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: 'Ride not found.',
            })
        }

        if (ride.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'A receipt is available only for completed rides.',
            })
        }

        // Find the payment record for this ride, if one exists.
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .select('payment_status, payment_method, transaction_id, amount')
            .eq('ride_id', ride.id)
            .eq('user_id', user.id)
            .eq('payment_status', 'paid')
            .maybeSingle()

        if (paymentError) throw paymentError

        // Email the receipt to the address saved in the user's profile.
        const emailResult = await sendRideReceiptEmail({
            to: user.email,
            ride,
            payment: payment || {
                payment_status: 'pending',
                payment_method: 'Not recorded',
            },
        })

        return res.status(200).json({
            success: true,
            message: 'Ride receipt emailed successfully.',
            data: {
                emailId: emailResult?.id || null,
            },
        })
    } catch (error) {
        console.error('Send ride receipt error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Unable to email ride receipt. Please try again.',
        })
    }
}