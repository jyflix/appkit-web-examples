'use client'

import { useEffect, useState } from 'react'
import {
    useAppKitState,
    useAppKitTheme,
    useAppKitEvents,
    useAppKitAccount,
    useWalletInfo
     } from '@reown/appkit/react'
import { useClientMounted } from "@/hooks/useClientMount"

export const InfoList = () => {
    const kitTheme = useAppKitTheme()
    const state = useAppKitState()
    const {address, caipAddress, isConnected, embeddedWalletInfo} = useAppKitAccount()
    const events = useAppKitEvents()
    const walletInfo = useWalletInfo()
    const mounted = useClientMounted()
    const [inWaitlist, setInWaitlist] = useState(false)

    useEffect(() => {
        console.log("Events: ", events)
    }, [events])

    useEffect(() => {
        const checkWaitlist = async () => {
            if (isConnected && address) {
                try {
                    const response = await fetch(`/api/waitlist/check?address=${address}`)
                    const data = await response.json()
                    setInWaitlist(data.inWaitlist)
                } catch (error) {
                    console.error('Failed to check waitlist:', error)
                    setInWaitlist(false)
                }
            } else {
                setInWaitlist(false)
            }
        }

        checkWaitlist()
    }, [isConnected, address])

  return !mounted ? null : (
    <>
        <section>
            <h2>useAppKit</h2>
            <pre>
                Address: {address}<br />
                caip Address: {caipAddress}<br />
                Connected: {isConnected.toString()}<br />
                {inWaitlist && `Waitlist Status: ✓ Member\n`}
                Account Type: {embeddedWalletInfo?.accountType}<br />
                {embeddedWalletInfo?.user?.username && (`Username: ${embeddedWalletInfo?.user?.username}\n`)}
                {embeddedWalletInfo?.authProvider && (`Provider: ${embeddedWalletInfo?.authProvider}\n`)}
            </pre>
        </section>

        <section>
            <h2>Theme</h2>
            <pre>
                Theme: {kitTheme.themeMode}<br />
            </pre>
        </section>

        <section>
            <h2>State</h2>
            <pre>
                activeChain: {state.activeChain}<br />
                loading: {state.loading.toString()}<br />
                open: {state.open.toString()}<br />
            </pre>
        </section>

        <section>
            <h2>WalletInfo</h2>
            <pre>
                Name: {walletInfo.walletInfo?.name?.toString()}<br />
            </pre>
        </section>
    </>
  )
}