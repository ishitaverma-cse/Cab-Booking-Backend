import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSupabase } = vi.hoisted(() => ({
    mockSupabase: {
        from: vi.fn(),
    },
}))

vi.mock('../config/supabase.js', () => ({
    default: mockSupabase,
}))

import { createRide, getRides } from '../controllers/rideController.js'

const createResponse = () => {
    const res = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res
}

describe('Ride Controller', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('createRide', () => {
        it('should reject a ride with missing required fields', async () => {
            const req = {
                clerkUserId: 'test_clerk_user',
                body: {
                    pickup_location: '',
                    drop_location: 'Pavilion Mall, Ludhiana',
                    ride_type: 'standard',
                    fare: 250,
                },
            }

            const res = createResponse()

            await createRide(req, res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            )
            expect(mockSupabase.from).not.toHaveBeenCalled()
        })

        it('should reject a negative fare', async () => {
            const req = {
                clerkUserId: 'test_clerk_user',
                body: {
                    pickup_location: 'Ludhiana Railway Station',
                    drop_location: 'Pavilion Mall, Ludhiana',
                    ride_type: 'standard',
                    fare: -100,
                },
            }

            const res = createResponse()

            await createRide(req, res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(mockSupabase.from).not.toHaveBeenCalled()
        })

        it('should reject a non-numeric fare', async () => {
            const req = {
                clerkUserId: 'test_clerk_user',
                body: {
                    pickup_location: 'Ludhiana Railway Station',
                    drop_location: 'Pavilion Mall, Ludhiana',
                    ride_type: 'standard',
                    fare: 'invalid',
                },
            }

            const res = createResponse()

            await createRide(req, res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(mockSupabase.from).not.toHaveBeenCalled()
        })

        it('should reject requests without an authenticated Clerk user', async () => {
            const req = {
                body: {
                    pickup_location: 'Ludhiana Railway Station',
                    drop_location: 'Pavilion Mall, Ludhiana',
                    ride_type: 'standard',
                    fare: 250,
                },
            }

            const res = createResponse()

            await createRide(req, res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(mockSupabase.from).not.toHaveBeenCalled()
        })
    })

    it('should create a ride successfully with valid details', async () => {
        const createdRide = {
            id: 'test-ride-id',
            user_id: 'test-user-id',
            pickup_location: 'Ludhiana Railway Station',
            drop_location: 'Pavilion Mall, Ludhiana',
            ride_type: 'standard',
            fare: 250,
            status: 'requested',
        }

        const mockSingle = vi.fn().mockResolvedValue({
            data: createdRide,
            error: null,
        })

        const mockInsertSelect = vi.fn().mockReturnValue({
            single: mockSingle,
        })

        const mockInsert = vi.fn().mockReturnValue({
            select: mockInsertSelect,
        })

        const mockMaybeSingle = vi.fn().mockResolvedValue({
            data: { id: 'test-user-id' },
            error: null,
        })

        const mockEq = vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle,
        })

        const mockUserSelect = vi.fn().mockReturnValue({
            eq: mockEq,
        })

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'users') {
                return { select: mockUserSelect }
            }

            if (table === 'rides') {
                return { insert: mockInsert }
            }
        })

        const req = {
            clerkUserId: 'test_clerk_user',
            body: {
                pickup_location: ' Ludhiana Railway Station ',
                drop_location: ' Pavilion Mall, Ludhiana ',
                ride_type: 'standard',
                fare: 250,
            },
        }

        const res = createResponse()

        await createRide(req, res)

        expect(mockSupabase.from).toHaveBeenCalledWith('users')
        expect(mockSupabase.from).toHaveBeenCalledWith('rides')
        expect(mockInsert).toHaveBeenCalledWith({
            user_id: 'test-user-id',
            pickup_location: 'Ludhiana Railway Station',
            drop_location: 'Pavilion Mall, Ludhiana',
            ride_type: 'standard',
            fare: 250,
            status: 'requested',
        })
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Ride requested successfully!',
            data: createdRide,
        })
    })

    describe('getRides', () => {
        it('should return an empty ride list when the user profile does not exist', async () => {
            const mockMaybeSingle = vi.fn().mockResolvedValue({
                data: null,
                error: null,
            })

            const mockEq = vi.fn().mockReturnValue({
                maybeSingle: mockMaybeSingle,
            })

            const mockSelect = vi.fn().mockReturnValue({
                eq: mockEq,
            })

            const mockOrder = vi.fn().mockReturnValue({
                eq: vi.fn(),
            })

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'rides') {
                    return {
                        select: vi.fn().mockReturnValue({
                            order: mockOrder,
                        }),
                    }
                }

                if (table === 'users') {
                    return {
                        select: mockSelect,
                    }
                }
            })

            const req = {
                clerkUserId: 'test_clerk_user',
            }

            const res = createResponse()

            await getRides(req, res)

            expect(mockSupabase.from).toHaveBeenCalledWith('users')
            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: [],
            })
        })
    })
})
