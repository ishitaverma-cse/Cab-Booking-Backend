import supabase from '../config/supabase.js'

export const getUsers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, clerk_id, name, email, phone, role, created_at')
            .eq('clerk_id', req.clerkUserId)
            .maybeSingle()

        if (error) {
            console.error('Get user error:', error.message)

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch user profile.',
            })
        }

        return res.status(200).json({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Get user error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred.',
        })
    }
}

export const createUser = async (req, res) => {
    try {
        const { name, email, phone } = req.body

        if (
            typeof name !== 'string' ||
            !name.trim() ||
            typeof email !== 'string' ||
            !email.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: 'Valid name and email are required.',
            })
        }

        if (
            phone !== undefined &&
            phone !== null &&
            typeof phone !== 'string'
        ) {
            return res.status(400).json({
                success: false,
                message: 'Phone must be a string.',
            })
        }

        const { data, error } = await supabase
            .from('users')
            .upsert(
                [{
                    clerk_id: req.clerkUserId,
                    name: name.trim(),
                    email: email.trim(),
                    phone: phone?.trim() || null,
                }],
                { onConflict: 'clerk_id' }
            )
            .select('id, clerk_id, name, email, phone, role, created_at')
            .single()

        if (error) {
            console.error('Create user error:', error.message)

            return res.status(500).json({
                success: false,
                message: 'Unable to save user profile.',
            })
        }

        return res.status(200).json({
            success: true,
            message: 'User profile saved successfully.',
            data,
        })
    } catch (error) {
        console.error('Create user error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred.',
        })
    }
}
