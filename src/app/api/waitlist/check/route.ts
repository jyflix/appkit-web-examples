import { NextRequest, NextResponse } from 'next/server'
import { getUserByWallet } from '@/models/User'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const walletAddress = searchParams.get('address')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    const user = await getUserByWallet(walletAddress)

    return NextResponse.json({
      inWaitlist: user ? (user.inWaitlist && user.isPaid) : false
    })
  } catch (error) {
    console.error('Error checking waitlist status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}