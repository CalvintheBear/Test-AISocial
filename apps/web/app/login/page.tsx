'use client'

import { SignIn, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { useClerkEnabled } from '@/hooks/useClerkEnabled'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
	const isClerkEnabled = useClerkEnabled()

	return (
		<div className="min-h-[60vh] flex items-center justify-center px-4">
			<div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6">
				<h1 className="text-2xl font-bold mb-2 text-center">登录到 AI 社区</h1>
				<p className="text-sm text-gray-500 mb-6 text-center">登录后可发布、收藏与个性化主页</p>

				{isClerkEnabled ? (
					<div className="space-y-4">
						<SignedOut>
							<SignIn routing="hash" />
						</SignedOut>
						<SignedIn>
							<div className="text-center space-y-3">
								<p className="text-green-600">你已登录。</p>
								<Link href="/user/me">
									<Button variant="primary" size="sm">前往个人主页</Button>
								</Link>
							</div>
						</SignedIn>
					</div>
				) : (
					<div className="text-center space-y-4">
						<p className="text-gray-600">当前未启用第三方登录。</p>
						<Link href="/feed"><Button variant="primary" size="sm">先去看看</Button></Link>
					</div>
				)}
			</div>
		</div>
	)
}


