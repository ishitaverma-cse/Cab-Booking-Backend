import crypto from 'node:crypto'
import supabase from '../config/supabase.js'
import razorpay from '../config/razorpay.js'

// Resolve the authenticated Clerk user to their Supabase profile.
const getSupabaseUser = async (clerkUserId) => {
    const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .maybeSingle()

    if (error) throw error
    return data
}

// Fetch only the authenticated user's payment records.
export const getPayments = async (req, res) => {
    try {
        const user = await getSupabaseUser(req.clerkUserId)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found.',
            })
        }

        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return res.status(200).json({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Get payments error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch payments.',
        })
    }
}

// Do not allow clients to create arbitrary payment records.
export const createPayment = async (req, res) => {
    return res.status(410).json({
        success: false,
        message:
            'Direct payment creation is disabled. Use the Razorpay checkout flow.',
    })
}

// Create a Razorpay order using the fare saved against the rider's ride.
export const createRazorpayOrder = async (req, res) => {
    try {
        const { ride_id } = req.body

        if (!ride_id) {
            return res.status(400).json({
                success: false,
                message: 'ride_id is required.',
            })
        }

        const user = await getSupabaseUser(req.clerkUserId)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found.',
            })
        }

        const { data: ride, error: rideError } = await supabase
            .from('rides')
            .select('id, user_id, fare, status')
            .eq('id', ride_id)
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
                message: 'Payment is available only after the ride is completed.',
            })
        }

        const fare = Number(ride.fare)

        if (!Number.isFinite(fare) || fare <= 0) {
            return res.status(400).json({
                success: false,
                message: 'The ride has an invalid fare.',
            })
        }

        const amountInPaise = Math.round(fare * 100)

        if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
            return res.status(400).json({
                success: false,
                message: 'The ride fare is outside the supported payment range.',
            })
        }

        // Prevent creating another order for an already paid ride.
        const { data: existingPayment, error: paymentLookupError } =
            await supabase
                .from('payments')
                .select('id')
                .eq('ride_id', ride.id)
                .eq('user_id', user.id)
                .eq('payment_status', 'paid')
                .maybeSingle()

        if (paymentLookupError) throw paymentLookupError

        if (existingPayment) {
            return res.status(409).json({
                success: false,
                message: 'This ride has already been paid for.',
            })
        }

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `ride_${ride.id}`,
            notes: {
                ride_id: String(ride.id),
                user_id: String(user.id),
            },
        })

        const { data: payment, error: insertError } = await supabase
            .from('payments')
            .insert({
                ride_id: ride.id,
                user_id: user.id,
                amount: fare,
                payment_method: 'razorpay',
                payment_status: 'pending',
                // Temporarily store the order ID until verification.
                transaction_id: order.id,
            })
            .select()
            .single()

        if (insertError) throw insertError

        return res.status(201).json({
            success: true,
            message: 'Razorpay order created successfully.',
            data: {
                payment,
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: process.env.RAZORPAY_KEY_ID,
            },
        })
    } catch (error) {
        console.error('Create Razorpay order error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Unable to create payment order.',
        })
    }
}

// Verify the checkout signature and confirm the payment with Razorpay.
export const verifyRazorpayPayment = async (req, res) => {
    try {
        const {
            ride_id,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body

        if (
            !ride_id ||
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                success: false,
                message: 'Required Razorpay verification details are missing.',
            })
        }

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex')

        const expectedBuffer = Buffer.from(expectedSignature, 'hex')
        const receivedBuffer = Buffer.from(razorpay_signature, 'hex')

        if (
            expectedBuffer.length !== receivedBuffer.length ||
            !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature.',
            })
        }

        const user = await getSupabaseUser(req.clerkUserId)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found.',
            })
        }

        // Ensure this order belongs to this user and ride.
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .select('*')
            .eq('ride_id', ride_id)
            .eq('user_id', user.id)
            .eq('transaction_id', razorpay_order_id)
            .eq('payment_status', 'pending')
            .maybeSingle()

        if (paymentError) throw paymentError

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Pending payment order not found.',
            })
        }

        // A valid signature alone does not prove the payment was captured.
        const razorpayPayment = await razorpay.payments.fetch(
            razorpay_payment_id
        )

        if (
            razorpayPayment.order_id !== razorpay_order_id ||
            razorpayPayment.status !== 'captured'
        ) {
            return res.status(400).json({
                success: false,
                message: 'Payment has not been captured successfully.',
            })
        }

        const { data: updatedPayment, error: updateError } = await supabase
            .from('payments')
            .update({
                payment_status: 'paid',
                transaction_id: razorpay_payment_id,
            })
            .eq('id', payment.id)
            .eq('user_id', user.id)
            .eq('payment_status', 'pending')
            .select()
            .maybeSingle()

        if (updateError) throw updateError

        if (!updatedPayment) {
            return res.status(409).json({
                success: false,
                message: 'Payment has already been processed.',
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Payment verified successfully.',
            data: updatedPayment,
        })
    } catch (error) {
        console.error('Verify Razorpay payment error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Unable to verify payment.',
        })
    }
}
