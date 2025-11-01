export interface WaitlistCheckResponse {
  inWaitlist: boolean
  isPaid: boolean
  needsPayment: boolean
}

export interface WaitlistJoinResponse {
  success: boolean
  message: string
  txHash?: string
}

export interface WaitlistState {
  loading: boolean
  inWaitlist: boolean
  isPaid: boolean
  error: string | null
}

export interface PaymentState {
  paying: boolean
  success: boolean
  error: string | null
  txHash: string | null
}