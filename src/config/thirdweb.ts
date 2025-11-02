import { createThirdwebClient } from 'thirdweb'
import { facilitator } from 'thirdweb/x402'
import { defineChain } from 'thirdweb/chains'

export const baseSepolia = defineChain({
  id: 84532,
  rpc: 'https://sepolia.base.org'
})

export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
export const PAYMENT_AMOUNT = '100000'
export const PAYMENT_PRICE = {
  amount: PAYMENT_AMOUNT,
  asset: {
    address: USDC_ADDRESS
  }
}

export function getThirdwebClient() {
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID
  if (!clientId) {
    throw new Error('NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set')
  }
  return createThirdwebClient({ clientId })
}

export function getThirdwebServerClient() {
  const secretKey = process.env.THIRDWEB_SECRET_KEY
  if (!secretKey) {
    throw new Error('THIRDWEB_SECRET_KEY is not set')
  }
  return createThirdwebClient({ secretKey })
}

export function getThirdwebFacilitator() {
  const serverWalletAddress = process.env.SERVER_WALLET_ADDRESS
  if (!serverWalletAddress) {
    throw new Error('SERVER_WALLET_ADDRESS is not set')
  }
  
  const client = getThirdwebServerClient()
  
  return facilitator({
    client,
    serverWalletAddress,
    waitUntil: 'confirmed'
  })
}