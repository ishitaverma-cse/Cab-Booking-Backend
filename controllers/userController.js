import supabase from '../config/supabase.js'

export const getUsers = async (req, res) => {
  const { data, error } = await supabase
    .from('users')
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

export const createUser = async (req, res) => {
  const { clerk_id, name, email, phone, role } = req.body

  if (!clerk_id || !name || !email) {
    return res.status(400).json({
      success: false,
      message: 'clerk_id, name and email are required',
    })
  }

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        clerk_id,
        name,
        email,
        phone,
        role: role || 'user',
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
    message: 'User created successfully',
    data,
  })
}