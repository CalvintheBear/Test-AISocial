"use client"

import { useEffect, useState } from 'react'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import Image from 'next/image'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArtworkGrid } from '@/components/app/ArtworkGrid'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { ArtworkListItem } from '@/lib/types'

export default function UserProfileClient({ username }: { username: string }) {
	const [me, setMe] = useState<any>(null)
	const [artworks, setArtworks] = useState<ArtworkListItem[]>([])
	const [favorites, setFavorites] = useState<ArtworkListItem[]>([])
	const [likes, setLikes] = useState<ArtworkListItem[]>([])
	const [loading, setLoading] = useState(true)
	const [needSignin, setNeedSignin] = useState(false)

	async function reloadAll(userId: string) {
		const [arts, favs, lks] = await Promise.all([
			authFetch(API.userArtworks(userId)),
			authFetch(API.userFavorites(userId)),
			authFetch(API.userLikes(userId)),
		])
		setArtworks(arts || [])
		setFavorites(favs || [])
		setLikes(lks || [])
	}

	useEffect(() => {
		let mounted = true
		async function run() {
			try {
				const profile = await authFetch(API.me)
				if (!mounted) return
				setMe(profile)
				if (profile?.id) {
					await reloadAll(profile.id)
				}
			} catch {
				setNeedSignin(true)
			} finally {
				if (mounted) setLoading(false)
			}
		}
		run()
		return () => { mounted = false }
	}, [])

	if (needSignin) {
		return (
			<div className="py-16 text-center">
				<p className="mb-4 text-gray-600">您尚未登录，请先登录以查看个人主页。</p>
				<SignInButton mode="modal"/>
			</div>
		)
	}

	return (
		<div>
			<div className="bg-gradient-to-r from-blue-500 to purple-600 h-64 rounded-lg mb-8 flex items-center">
				<div className="flex items-center space-x-6 px-8">
					<Image
						src={me?.profilePic || 'https://via.placeholder.com/120x120/cccccc/666666?text=用户'}
						alt={me?.name || '用户'}
						width={120}
						height={120}
						className="rounded-full border-4 border-white"
					/>
					<div className="text-white">
						<h1 className="text-3xl font-bold">{me?.name || '未登录用户'}</h1>
						<p className="text-lg opacity-90">@{username}</p>
					</div>
				</div>
			</div>

			<div className="mb-6 text-sm text-gray-600">
				<SignedOut>您当前以游客身份浏览。登录后可查看草稿与个性化数据。</SignedOut>
				<SignedIn>您已登录，可查看私有数据与交互能力。</SignedIn>
			</div>

			<Tabs defaultValue="works" className="w-full">
				<TabsList className="grid w-full grid-cols-3 max-w-lg mb-8">
					<TabsTrigger value="works">我的作品</TabsTrigger>
					<TabsTrigger value="favorites">我的收藏</TabsTrigger>
					<TabsTrigger value="likes">我的点赞</TabsTrigger>
				</TabsList>

				<TabsContent value="works">
					<ArtworkGrid artworks={artworks} loading={loading} />
				</TabsContent>
				<TabsContent value="favorites">
					<ArtworkGrid artworks={favorites} loading={loading} />
				</TabsContent>
				<TabsContent value="likes">
					<ArtworkGrid artworks={likes} loading={loading} />
				</TabsContent>
			</Tabs>
		</div>
	)
}
