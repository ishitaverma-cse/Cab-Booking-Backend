import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const sendRideReceiptEmail = async ({
    to,
    ride,
    payment,
}) => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('Resend API key is not configured.')
    }

    const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: [to],
        subject: `RideFlow Receipt — Ride ${ride.id}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; color: #1e293b;">
                <h1 style="color: #2563eb;">RideFlow</h1>
                <h2>Your Ride Receipt</h2>
                <p>Thank you for riding with RideFlow!</p>

                <hr style="border: 0; border-top: 1px solid #e2e8f0;" />

                <p><strong>Booking ID:</strong> ${ride.id}</p>
                <p><strong>Date:</strong> ${new Date(ride.created_at).toLocaleString('en-IN')}</p>
                <p><strong>Pickup:</strong> ${ride.pickup_location}</p>
                <p><strong>Destination:</strong> ${ride.drop_location}</p>
                <p><strong>Vehicle:</strong> ${ride.ride_type}</p>
                <p><strong>Fare:</strong> ₹${Number(ride.fare).toFixed(2)}</p>
                <p><strong>Payment status:</strong> ${payment?.payment_status || 'pending'}</p>
                <p><strong>Payment method:</strong> ${payment?.payment_method || 'Not recorded'}</p>

                <hr style="border: 0; border-top: 1px solid #e2e8f0;" />

                <p style="font-size: 12px; color: #64748b;">
                    This is an automatically generated receipt from RideFlow.
                </p>
            </div>
        `,
    })

    if (error) {
        throw new Error(error.message || 'Unable to send ride receipt.')
    }

    return data
}