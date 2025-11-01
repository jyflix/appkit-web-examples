import clientPromise from '@/lib/mongodb'

export interface User {
  _id?: string
  walletAddress: string
  isPaid: boolean
  inWaitlist: boolean
  paymentTxHash?: string
  paymentAmount?: string
  paymentToken?: string
  chainId?: number
  createdAt: Date
  updatedAt: Date
  paymentVerifiedAt?: Date
}

export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB_NAME || 'waitlist-db')
  const users = db.collection<User>('users')
  
  return await users.findOne({ walletAddress: walletAddress.toLowerCase() })
}

export async function createOrUpdateUser(data: Partial<User>): Promise<User> {
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB_NAME || 'waitlist-db')
  const users = db.collection<User>('users')
  
  const walletAddress = data.walletAddress?.toLowerCase()
  if (!walletAddress) {
    throw new Error('Wallet address is required')
  }

  const now = new Date()
  const userData: Partial<User> = {
    ...data,
    walletAddress,
    updatedAt: now,
  }

  const result = await users.findOneAndUpdate(
    { walletAddress },
    { 
      $set: userData,
      $setOnInsert: { createdAt: now }
    },
    { 
      upsert: true, 
      returnDocument: 'after'
    }
  )

  return result as User
}

export async function markUserAsPaid(
  walletAddress: string,
  txHash: string,
  amount: string,
  token: string,
  chainId: number
): Promise<User> {
  return await createOrUpdateUser({
    walletAddress,
    isPaid: true,
    inWaitlist: true,
    paymentTxHash: txHash,
    paymentAmount: amount,
    paymentToken: token,
    chainId,
    paymentVerifiedAt: new Date()
  })
}