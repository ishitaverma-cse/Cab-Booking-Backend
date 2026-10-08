import supabase from '../config/supabase.js'

export const getRides = async (req, res) => {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }

  res.status(200).json({
    success: true,
    data,
  })
}

export const createRide = async (req, res) => {
  const {
    user_id,
    pickup_location,
    drop_location,
    ride_type,
    fare,
    status,
  } = req.body

  if (!user_id || !pickup_location || !drop_location) {
    return res.status(400).json({
      success: false,
      message: 'user_id, pickup_location and drop_location are required',
    })
  }

  const { data, error } = await supabase
    .from('rides')
    .insert([
      {
        user_id,
        pickup_location,
        drop_location,
        ride_type: ride_type || 'standard',
        fare: fare || 0,
        status: status || 'requested',
      },
    ])
    .select()
    .single()

  if (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }

  res.status(201).json({
    success: true,
    message: 'Ride created successfully',
    data,
  })
}