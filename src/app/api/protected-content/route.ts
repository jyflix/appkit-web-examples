import { NextRequest, NextResponse } from 'next/server'
import { settlePayment } from 'thirdweb/x402'
import { getUserByWallet, markUserAsPaid } from '@/models/User'
import { createPayment } from '@/models/Payment'
import { getThirdwebFacilitator, baseSepolia, PAYMENT_PRICE, PAYMENT_AMOUNT } from '@/config/thirdweb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    const existingUser = await getUserByWallet(walletAddress)
    
    if (existingUser && existingUser.isPaid && existingUser.inWaitlist) {
      return NextResponse.json({
        success: true,
        message: 'Welcome back to exclusive content!',
        data: {
          secretInfo: 'This is protected content only for waitlist members.',
          benefits: [
            'Early access to new features',
            'Priority support',
            'Exclusive community access'
          ],
          memberSince: existingUser.createdAt,
          txHash: existingUser.paymentTxHash,
          status: 'already_member'
        }
      })
    }

    const paymentData = request.headers.get('x-payment')
    const serverWalletAddress = process.env.SERVER_WALLET_ADDRESS

    if (!serverWalletAddress) {
      throw new Error('SERVER_WALLET_ADDRESS is not configured')
    }

    const thirdwebFacilitator = getThirdwebFacilitator()
    const resourceUrl = `${request.nextUrl.origin}/api/protected-content`

    console.log('Settling payment...')
    console.log('Payment data exists:', !!paymentData)
    console.log('Resource URL:', resourceUrl)

    const result = await settlePayment({
      resourceUrl,
      method: 'POST',
      paymentData,
      payTo: serverWalletAddress,
      network: baseSepolia,
      price: PAYMENT_PRICE,
      facilitator: thirdwebFacilitator,
    })

    console.log('Settlement result status:', result.status)

    if (result.status === 200) {
      const txHash = result.responseHeaders?.['x-transaction-hash'] || 'unknown'

      console.log('Payment successful, transaction hash:', txHash)

      await createPayment({
        walletAddress,
        txHash,
        amount: '0.1',
        token: 'USDC',
        chainId: baseSepolia.id,
        status: 'confirmed',
        paymentData: paymentData || null,
        confirmedAt: new Date()
      })

      const user = await markUserAsPaid(
        walletAddress,
        txHash,
        '0.1',
        'USDC',
        baseSepolia.id
      )

      return NextResponse.json({
        success: true,
        message: 'Payment successful! Welcome to exclusive content!',
        data: {
          secretInfo: 'This is protected content only for waitlist members.',
          benefits: [
            'Early access to new features',
            'Priority support',
            'Exclusive community access'
          ],
          memberSince: user.createdAt,
          txHash,
          status: 'new_member'
        }
      })
    } else {
      if (result.status === 402) {
        console.log('Payment required, returning 402')
        
        await createPayment({
          walletAddress,
          amount: '0.1',
          token: 'USDC',
          chainId: baseSepolia.id,
          status: 'pending',
          paymentData: null
        })
      }

      return NextResponse.json(
        result.responseBody,
        {
          status: result.status,
          headers: result.responseHeaders as HeadersInit
        }
      )
    }
  } catch (error) {
    console.error('Error accessing protected content:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}