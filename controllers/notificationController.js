
import supabase from '../config/supabase.js'

const getDatabaseUser = async clerkUserId => {
    const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .maybeSingle()

    if (error) throw error

    return user
}

export const getNotifications = async (req, res) => {
    try {
        const user = await getDatabaseUser(req.clerkUserId)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found.',
            })
        }

        const { data, error } = await supabase
            .from('notifications')
            .select('id, ride_id, status, message, is_read, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw error

        return res.status(200).json({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Fetch notifications error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch notifications.',
        })
    }
}

export const markNotificationRead = async (req, res) => {
    try {
        const user = await getDatabaseUser(req.clerkUserId)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found.',
            })
        }

        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', req.params.notificationId)
            .eq('user_id', user.id)
            .select('id, is_read')
            .maybeSingle()

        if (error) throw error

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found.',
            })
        }

        return res.status(200).json({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Mark notification read error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Unable to update notification.',
        })
    }
}

export const deleteNotification = async (req, res) => {
    try {
        const user = await getDatabaseUser(req.clerkUserId)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found.',
            })
        }

        const { data, error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', req.params.notificationId)
            .eq('user_id', user.id)
            .select('id')
            .maybeSingle()

        if (error) throw error

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found.',
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Notification dismissed.',
        })
    } catch (error) {
        console.error('Delete notification error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Unable to dismiss notification.',
        })
    }
}

export const clearNotifications = async (req, res) => {
    try {
        const user = await getDatabaseUser(req.clerkUserId)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found.',
            })
        }

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id)

        if (error) throw error

        return res.status(200).json({
            success: true,
            message: 'Notifications cleared.',
        })
    } catch (error) {
        console.error('Clear notifications error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Unable to clear notifications.',
        })
    }
}
