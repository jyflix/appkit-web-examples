'use client'

import { useState, useEffect } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import { useWalletClient, useSwitchChain, useDisconnect } from 'wagmi'
import { wrapFetchWithPayment } from 'thirdweb/x402'
import { createThirdwebClient } from 'thirdweb'
import { createWalletAdapter } from 'thirdweb/wallets'
import { viemAdapter } from 'thirdweb/adapters/viem'
import { defineChain } from 'thirdweb/chains'

interface ContentData {
  success: boolean
  message: string
  data?: {
    secretInfo: string
    benefits: string[]
    memberSince: string
    txHash: string
    status: 'already_member' | 'new_member'
  }
}

const BASE_SEPOLIA_CHAIN_ID = 84532

export const WaitlistButton = () => {
  const { address, isConnected } = useAppKitAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()
  const { disconnectAsync } = useDisconnect()
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState<ContentData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkStatus = async () => {
    if (!address) return

    setIsChecking(true)
    try {
      const response = await fetch('/api/protected-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      })

      if (response.ok) {
        const data: ContentData = await response.json()
        if (data.data?.status === 'already_member') {
          setContent(data)
        }
      }
    } catch (err) {
      console.log('Not in waitlist yet')
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    if (isConnected && address) {
      checkStatus()
    } else {
      setContent(null)
    }
  }, [isConnected, address])

  const handleAccessContent = async () => {
    if (!address || !walletClient) {
      setError('Please connect your wallet first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const currentChainId = await walletClient.getChainId()
      
      if (currentChainId !== BASE_SEPOLIA_CHAIN_ID) {
        setError(`Please switch to Base Sepolia network (Chain ID: ${BASE_SEPOLIA_CHAIN_ID})`)
        try {
          await switchChainAsync({ chainId: BASE_SEPOLIA_CHAIN_ID })
        } catch (switchError) {
          console.error('Failed to switch network:', switchError)
          setLoading(false)
          return
        }
      }

      const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID
      if (!clientId) {
        throw new Error('Thirdweb client ID not configured')
      }

      const client = createThirdwebClient({ clientId })
      
      console.log('Converting wallet client...')
      const adaptedAccount = viemAdapter.walletClient.fromViem({
        walletClient: walletClient as any,
      })

      const chainId = await walletClient.getChainId()
      
      console.log('Creating wallet adapter...')
      const adaptedWallet = createWalletAdapter({
        adaptedAccount,
        chain: defineChain(chainId),
        client,
        onDisconnect: async () => {
          await disconnectAsync()
        },
        switchChain: async (chain) => {
          await switchChainAsync({ chainId: chain.id as any })
        }
      })

      console.log('Wrapping fetch with payment...')
      const fetchWithPay = wrapFetchWithPayment(
        fetch, 
        client, 
        adaptedWallet,
        10000000
      )

      console.log('Making payment request...')
      const response = await fetchWithPay('/api/protected-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address })
      })

      console.log('Response received:', response)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', errorText)
        throw new Error(`Request failed: ${response.status} ${errorText}`)
      }

      const data: ContentData = await response.json()
      console.log('Response data:', data)

      if (data.success) {
        setContent(data)
        setError(null)
      } else {
        throw new Error(data.message || 'Failed to access content')
      }
    } catch (err) {
      console.error('Payment error details:', err)
      
      let errorMessage = 'Failed to process payment'
      if (err instanceof Error) {
        errorMessage = err.message
        
        if (err.message.includes('User rejected')) {
          errorMessage = 'Payment signature rejected'
        } else if (err.message.includes('insufficient')) {
          errorMessage = 'Insufficient USDC or ETH for gas'
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.'
        }
      }
      
      setError(errorMessage)
      setContent(null)
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return null
  }

  if (isChecking) {
    return <button disabled>Checking status...</button>
  }

  if (content && content.data) {
    return (
      <div style={{ margin: '20px', textAlign: 'center' }}>
        <button 
          disabled 
          style={{ 
            backgroundColor: '#4ade80', 
            borderColor: '#4ade80', 
            cursor: 'default',
            marginBottom: '15px'
          }}
        >
          ✓ Waitlist Member
        </button>
        
        <section style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
          <h2>{content.message}</h2>
          <pre>
            {content.data.secretInfo}<br /><br />
            <strong>Benefits:</strong><br />
            {content.data.benefits.map((b, i) => `  ${i + 1}. ${b}`).join('\n')}<br /><br />
            <strong>Member Since:</strong> {new Date(content.data.memberSince).toLocaleDateString()}<br />
            <strong>Transaction:</strong> {content.data.txHash}<br />
          </pre>
        </section>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', margin: '20px' }}>
      <button 
        onClick={handleAccessContent}
        disabled={loading || !walletClient}
        style={{ 
          backgroundColor: loading ? '#d1d5db' : '#fbbf24', 
          borderColor: loading ? '#9ca3af' : '#f59e0b',
          color: '#000'
        }}
      >
        {loading ? 'Processing...' : 'Pay 0.1 USDC to Access Exclusive Content'}
      </button>
      {error && (
        <p style={{ color: 'red', fontSize: '12px', marginTop: '5px', maxWidth: '400px', margin: '5px auto 0' }}>
          {error}
        </p>
      )}
      <p style={{ fontSize: '11px', marginTop: '10px', color: '#666' }}>
        Network: Base Sepolia | Amount: 0.1 USDC
      </p>
    </div>
  )
}