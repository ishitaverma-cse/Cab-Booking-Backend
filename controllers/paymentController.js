import supabase from '../config/supabase.js'

export const getPayments = async (req, res) => {
  const { data, error } = await supabase
    .from('payments')
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

export const createPayment = async (req, res) => {
  const {
    ride_id,
    user_id,
    amount,
    payment_method,
    payment_status,
    transaction_id,
  } = req.body

  if (!ride_id || !user_id || amount === undefined) {
    return res.status(400).json({
      success: false,
      message: 'ride_id, user_id and amount are required',
    })
  }

  const { data, error } = await supabase
    .from('payments')
    .insert([
      {
        ride_id,
        user_id,
        amount,
        payment_method: payment_method || 'cash',
        payment_status: payment_status || 'pending',
        transaction_id,
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
    message: 'Payment created successfully',
    data,
  })
}