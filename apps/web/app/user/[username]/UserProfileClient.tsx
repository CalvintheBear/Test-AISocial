"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/nextjs'
import Image from 'next/image'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArtworkGrid } from '@/components/app/ArtworkGrid'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { ArtworkListItem } from '@/lib/types'
import { adaptArtworkList } from '@/lib/apiAdapter'
import { useUserArtworks } from '@/hooks/useUserArtworks'
import { useFavorites } from '@/hooks/useFavorites'
import { Button } from '@/components/ui/button'
import { useLike } from '@/hooks/useLike'
import { useFavorite } from '@/hooks/useFavorite'
import { useClerkEnabled } from '@/hooks/useClerkEnabled'

export default function UserProfileClient({ username }: { username: string }) {
	const isClerkEnabled = useClerkEnabled()
	const { isLoaded, isSignedIn } = useAuth()
	const [me, setMe] = useState<any>(null)
	const [hideName, setHideName] = useState(false)
	const [hideEmail, setHideEmail] = useState(false)
	const [artworks, setArtworks] = useState<ArtworkListItem[]>([])
	const [favorites, setFavorites] = useState<ArtworkListItem[]>([])
	const [likes, setLikes] = useState<ArtworkListItem[]>([])
	const [loading, setLoading] = useState(true)


	const reloadAll = useCallback(async (userId: string) => {
		const [lks] = await Promise.all([
			authFetch(API.userLikes(userId)).then(data => adaptArtworkList(data || [])),
		])
		setLikes(lks || [])
	}, [])

	const loadProfile = useCallback(async () => {
		try {
			setLoading(true)
			const profile = await authFetch(API.me)
			setMe(profile)
			setHideName(!profile?.name)
			setHideEmail(!profile?.email)
			if (profile?.id) await reloadAll(profile.id)
		} catch {
			// 忽略错误，不把它当作未登录；保持 UI 为已登录状态并允许稍后重试
		} finally {
			setLoading(false)
		}
	}, [reloadAll])

	// 当认证状态变化时，重新加载资料
	useEffect(() => {
		if (!isLoaded) return
		if (!isSignedIn) {
			setMe(null)
			setArtworks([]); setFavorites([]); setLikes([])
			setLoading(false)
			return
		}
		loadProfile()
	}, [isLoaded, isSignedIn, loadProfile])

	// 使用 SWR 驱动作品与收藏，确保上传后缓存失效能反映到页面
	const userId = me?.id as string | undefined
	const { artworks: swrArtworks } = useUserArtworks(userId || '')
	const { artworks: swrFavorites } = useFavorites(userId || '')
	useEffect(() => { if (swrArtworks) setArtworks(swrArtworks) }, [swrArtworks])
	useEffect(() => { if (swrFavorites) setFavorites(swrFavorites) }, [swrFavorites])

	const persistPrivacy = useCallback(async (payload: { hideName?: boolean; hideEmail?: boolean }) => {
		try {
			const updated = await authFetch('/api/users/me/privacy', { method: 'POST', body: JSON.stringify(payload) })
			setMe(updated)
			if (typeof payload.hideName === 'boolean') setHideName(payload.hideName)
			if (typeof payload.hideEmail === 'boolean') setHideEmail(payload.hideEmail)
		} catch {}
	}, [])

	// Actions: like / favorite
	const { like } = useLike()
	const { addFavorite, removeFavorite } = useFavorite()
	const likedOnceRef = useRef<Set<string>>(new Set())

	const handleLike = useCallback(async (artworkId: string) => {
		if (!artworkId) return
		if (likedOnceRef.current.has(artworkId)) return
		likedOnceRef.current.add(artworkId)
		// optimistic update in all tabs
		const bump = (list: ArtworkListItem[]) => list.map(a => a.id === artworkId ? { ...a, like_count: a.like_count + 1, user_state: { ...a.user_state, liked: true } } : a)
		setArtworks(prev => bump(prev))
		setFavorites(prev => bump(prev))
		setLikes(prev => bump(prev))
		try { await like(artworkId) } catch {}
	}, [like])

	const handleFavorite = useCallback(async (artworkId: string) => {
		if (!artworkId) return
		let nextIsFav = false
		const toggle = (list: ArtworkListItem[]) => list.map(a => {
			if (a.id !== artworkId) return a
			nextIsFav = !a.user_state.faved
			return { ...a, fav_count: a.fav_count + (nextIsFav ? 1 : -1), user_state: { ...a.user_state, faved: nextIsFav } }
		})
		setArtworks(prev => toggle(prev))
		setFavorites(prev => toggle(prev))
		setLikes(prev => toggle(prev))
		try {
			if (nextIsFav) await addFavorite(artworkId)
			else await removeFavorite(artworkId)
		} catch {}
	}, [addFavorite, removeFavorite])

	// 仅当本人访问自己的主页时，才允许显示“隐藏名称/邮箱”按钮
	const isOwner = username === 'me' || !!(me?.id && username === me.id)

	// 当 Clerk 已加载且未登录时，显示登录提示
	if (isClerkEnabled && isLoaded && !isSignedIn) {
		return (
			<div className="py-16 text-center">
				<p className="mb-4 text-gray-600">您尚未登录，请先登录以查看个人主页。</p>
				<SignInButton mode="modal"/>
			</div>
		)
	}

	// 当 Clerk 未启用时，显示提示信息
	if (!isClerkEnabled) {
		return (
			<div className="py-16 text-center">
				<p className="mb-4 text-gray-600">认证功能未启用，无法查看个人主页。</p>
				<p className="text-sm text-gray-500">请联系管理员启用用户认证功能。</p>
			</div>
		)
	}

	return (
		<div>
			<div className="bg-gradient-to-r from-blue-500 to-purple-600 h-64 rounded-lg mb-8 flex items-center">
				<div className="flex items-center space-x-6 px-8">
					<Image
						src={me?.profilePic || 'https://via.placeholder.com/120x120/cccccc/666666?text=用户'}
						alt={me?.name || '用户'}
						width={120}
						height={120}
						className="rounded-full border-4 border-white"
					/>
					<div className="text-white">
						<div className="flex items-center space-x-3">
							<h1 className="text-3xl font-bold">{hideName ? '匿名用户' : (me?.name || '未登录用户')}</h1>
							{isOwner && (
								<Button size="sm" variant="outline" className="bg-white/20 border-white/40" onClick={() => persistPrivacy({ hideName: !hideName })}>
									{hideName ? '显示名称' : '隐藏名称'}
								</Button>
							)}
						</div>
						<div className="flex items-center space-x-3">
							<p className="text-lg opacity-90">{hideEmail ? '暂不可见' : (me?.email || '未绑定邮箱')}</p>
							{isOwner && (
								<Button size="sm" variant="outline" className="bg-white/20 border-white/40" onClick={() => persistPrivacy({ hideEmail: !hideEmail })}>
									{hideEmail ? '显示邮箱' : '隐藏邮箱'}
								</Button>
							)}
						</div>
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
					<ArtworkGrid artworks={artworks} loading={loading} onLike={handleLike} onFavorite={handleFavorite} />
				</TabsContent>
				<TabsContent value="favorites">
					<ArtworkGrid artworks={favorites} loading={loading} onLike={handleLike} onFavorite={handleFavorite} />
				</TabsContent>
				<TabsContent value="likes">
					<ArtworkGrid artworks={likes} loading={loading} onLike={handleLike} onFavorite={handleFavorite} />
				</TabsContent>
			</Tabs>
		</div>
	)
}
