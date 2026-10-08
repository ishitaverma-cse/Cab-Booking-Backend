import express from 'express'
import { getRides, createRide } from '../controllers/rideController.js'

const router = express.Router()

router.get('/', getRides)
router.post('/', createRide)

export default router