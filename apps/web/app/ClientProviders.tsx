'use client'

import { ClerkProvider } from '@clerk/nextjs'

export default function ClientProviders(props: { publishableKey: string; children: any }) {
	const { publishableKey, children } = props
	return (
		<ClerkProvider publishableKey={publishableKey}>
			{children}
		</ClerkProvider>
	)
}


