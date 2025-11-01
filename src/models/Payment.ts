import clientPromise from '@/lib/mongodb'

export interface Payment {
  _id?: string
  walletAddress: string
  txHash?: string
  amount: string
  token: string
  chainId: number
  status: 'pending' | 'confirmed' | 'failed'
  paymentData?: any
  createdAt: Date
  confirmedAt?: Date
}

export async function createPayment(data: Omit<Payment, '_id' | 'createdAt'>): Promise<Payment> {
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB_NAME || 'waitlist-db')
  const payments = db.collection<Payment>('payments')
  
  const payment: Payment = {
    ...data,
    walletAddress: data.walletAddress.toLowerCase(),
    createdAt: new Date(),
  }

  const result = await payments.insertOne(payment as any)
  return { ...payment, _id: result.insertedId.toString() }
}

export async function updatePaymentStatus(
  walletAddress: string,
  txHash: string,
  status: 'confirmed' | 'failed'
): Promise<void> {
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB_NAME || 'waitlist-db')
  const payments = db.collection<Payment>('payments')
  
  await payments.updateOne(
    { walletAddress: walletAddress.toLowerCase(), txHash },
    { 
      $set: { 
        status,
        confirmedAt: status === 'confirmed' ? new Date() : undefined
      }
    }
  )
}

export async function getPaymentsByWallet(walletAddress: string): Promise<Payment[]> {
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB_NAME || 'waitlist-db')
  const payments = db.collection<Payment>('payments')
  
  return await payments
    .find({ walletAddress: walletAddress.toLowerCase() })
    .sort({ createdAt: -1 })
    .toArray() as Payment[]
}