import supabase from '../config/supabase.js'

// Submit a review for a completed ride
export const createReview = async (req, res) => {
    try {
        const { rideId } = req.params
        const { rating, review_text } = req.body

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be a whole number between 1 and 5.',
            })
        }

        if (
            review_text !== undefined &&
            review_text !== null &&
            (
                typeof review_text !== 'string' ||
                review_text.length > 1000
            )
        ) {
            return res.status(400).json({
                success: false,
                message: 'Review must be 1000 characters or fewer.',
            })
        }

        // Resolve the authenticated Clerk user to a Supabase user.
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', req.clerkUserId)
            .maybeSingle()

        if (userError) {
            throw userError
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found.',
            })
        }

        // Verify that this ride belongs to the user and is completed.
        const { data: ride, error: rideError } = await supabase
            .from('rides')
            .select('id, user_id, status')
            .eq('id', rideId)
            .eq('user_id', user.id)
            .maybeSingle()

        if (rideError) {
            throw rideError
        }

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: 'Ride not found for this user.',
            })
        }

        if (ride.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Only completed rides can be reviewed.',
            })
        }

        const { data: review, error: reviewError } = await supabase
            .from('reviews')
            .insert({
                ride_id: ride.id,
                user_id: user.id,
                rating,
                review_text: review_text?.trim() || null,
            })
            .select()
            .single()

        if (reviewError) {
            if (reviewError.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'This ride has already been reviewed.',
                })
            }

            throw reviewError
        }

        return res.status(201).json({
            success: true,
            message: 'Review submitted successfully.',
            review,
        })
    } catch (error) {
        console.error('Create review error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to submit review.',
        })
    }
}

export const getRatingSummary = async (req, res) => {
    try {
        const { data, error } = await supabase
            .rpc('get_rating_summary')

        if (error) {
            throw error
        }

        const summary = data?.[0]

        return res.status(200).json({
            success: true,
            averageRating: Number(summary?.average_rating ?? 0),
            totalReviews: Number(summary?.total_reviews ?? 0),
        })
    } catch (error) {
        console.error('Get rating summary error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve rating summary.',
        })
    }
}



export const getMyReviews = async (req, res) => {
    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', req.clerkUserId)
            .maybeSingle()

        if (userError) {
            throw userError
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found.',
            })
        }

        const { data: reviews, error: reviewsError } = await supabase
            .from('reviews')
            .select('ride_id, rating, review_text, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (reviewsError) {
            throw reviewsError
        }

        return res.status(200).json({
            success: true,
            data: reviews || [],
        })
    } catch (error) {
        console.error('Get my reviews error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve your reviews.',
        })
    }
}


