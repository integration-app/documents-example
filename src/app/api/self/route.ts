import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
    try {
        const auth = getAuthFromRequest(request)
        return NextResponse.json({
            customerId: auth.customerId,
            customerName: auth.customerName
        })
    } catch (error) {
        console.error('Error getting user info:', error)
        return NextResponse.json(
            { error: 'Failed to get user info' },
            { status: 500 }
        )
    }
}   