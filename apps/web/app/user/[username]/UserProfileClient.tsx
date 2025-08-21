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
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

export default function UserProfileClient({ username, initialProfile, initialArtworks }: { username: string; initialProfile?: any; initialArtworks?: ArtworkListItem[] }) {
	const isClerkEnabled = useClerkEnabled()
	const { isLoaded, isSignedIn } = useAuth()
	// 当前会话用户（用于权限判断）
	const [me, setMe] = useState<any>(null)
	// 页面主体用户资料（可能是本人，也可能是他人）
	const [profile, setProfile] = useState<any>(initialProfile || null)
	const [hideName, setHideName] = useState(!initialProfile?.name)
	const [hideEmail, setHideEmail] = useState(!initialProfile?.email)
	const [artworks, setArtworks] = useState<ArtworkListItem[]>(initialArtworks || [])
	const [favorites, setFavorites] = useState<ArtworkListItem[]>([])
	const [likes, setLikes] = useState<ArtworkListItem[]>([])
	const [loading, setLoading] = useState(!initialArtworks)


	const reloadAll = useCallback(async (userId: string) => {
		const [lks] = await Promise.all([
			authFetch(API.userLikes(userId)).then(data => adaptArtworkList(data || [])),
		])
		setLikes(lks || [])
	}, [])

	const loadProfile = useCallback(async () => {
		try {
			setLoading(true)
			// 仅当访问 "me" 时才请求当前用户资料
			if (username === 'me') {
				const current = await authFetch(API.me)
				setMe(current)
				setProfile(current)
				setHideName(!current?.name)
				setHideEmail(!current?.email)
				// likes 改为按需加载（切至 likes Tab 时再请求）
			}
		} catch {
			// 忽略错误，不把它当作未登录；保持 UI 为已登录状态并允许稍后重试
		} finally {
			setLoading(false)
		}
	}, [reloadAll, username])

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

	// Tab 状态：首次从 URL 读取，之后仅本地更新；用 history.replaceState 同步地址，避免触发 Next RSC 请求
	const searchParams = useSearchParams()
	const router = useRouter()
	const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'works')
	const setTab = (tab: string) => {
		setActiveTab(tab)
		try {
			const url = new URL(window.location.href)
			url.searchParams.set('tab', tab)
			window.history.replaceState(null, '', url.toString())
		} catch {}
	}

	// 目标用户ID：访问他人主页时使用 `username`，访问 "me" 时使用当前用户ID
	const targetUserId = (username === 'me' ? profile?.id : username) as string | undefined
	const { artworks: swrArtworks } = useUserArtworks(targetUserId || '', initialArtworks)
	// 收藏按需加载：只有当前 Tab 激活才发起请求
	const enableFavorites = activeTab === 'favorites'
	const { artworks: swrFavorites, mutate: refreshFavorites } = useFavorites(enableFavorites ? (targetUserId || '') : '', undefined)
	useEffect(() => { if (swrArtworks) setArtworks(swrArtworks) }, [swrArtworks])
	useEffect(() => { if (swrFavorites) setFavorites(swrFavorites) }, [swrFavorites])
	// 当切到“我的收藏”时，若还未拉取，则主动触发一次
	useEffect(() => {
		if (!enableFavorites) return
		if (!targetUserId) return
		if (favorites.length > 0) return
		refreshFavorites()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enableFavorites, targetUserId])

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

	// likes 按需加载：当切换到 likes 页签时再请求
	useEffect(() => {
		const uid = targetUserId
		if (!uid) return
		if (activeTab !== 'likes') return
		if (likes && likes.length > 0) return
		reloadAll(uid)
	}, [activeTab, targetUserId, reloadAll, likes])

	// 当 Clerk 已加载且未登录时，展示营销态（英雄区+CTA+示例卡）
	if (isClerkEnabled && isLoaded && !isSignedIn) {
		return (
			<div>
				<div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mb-8 px-8 py-12 text-white">
					<h1 className="text-3xl font-bold mb-2">创建并展示你的 AI 艺术主页</h1>
					<p className="opacity-90 mb-6">登录后可发布作品、收藏/点赞、个性化你的主页。</p>
					<div className="flex gap-3">
						<SignInButton mode="modal">
							<Button variant="primary">登录 / 注册</Button>
						</SignInButton>
						<Link href="/feed"><Button variant="outline" className="bg-white/10 border-white/30 text-white">先逛逛</Button></Link>
					</div>
				</div>

				<div className="space-y-6">
					<h2 className="text-xl font-semibold">你可能会喜欢</h2>
					<ArtworkGrid 
						artworks={artworks}
						loading={false}
						locked 
						onLockedClick={() => {
							// 未登录时引导至登录页（使用内置登录页触发 Clerk 登录）
							window.location.href = '/login'
						}}
					/>
				</div>
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
						src={profile?.profilePic || profile?.profile_pic || '/images/default-avatar.jpg'}
						alt={(profile?.name || '').trim() || '未命名用户'}
						width={120}
						height={120}
						className="rounded-full border-4 border-white"
					/>
					<div className="text-white">
						<div className="flex items-center space-x-3">
							<h1 className="text-3xl font-bold">{hideName ? '匿名用户' : (profile?.name || '未命名用户')}</h1>
							{isOwner && (
								<Button size="sm" variant="outline" className="bg-white/20 border-white/40" onClick={() => persistPrivacy({ hideName: !hideName })}>
									{hideName ? '显示名称' : '隐藏名称'}
								</Button>
							)}
						</div>
						<div className="flex items-center space-x-3">
							<p className="text-lg opacity-90">{hideEmail ? '暂不可见' : (profile?.email || '未绑定邮箱')}</p>
							{isOwner && (
								<Button size="sm" variant="outline" className="bg-white/20 border-white/40" onClick={() => persistPrivacy({ hideEmail: !hideEmail })}>
									{hideEmail ? '显示邮箱' : '隐藏邮箱'}
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
				<div className="bg-white rounded-lg p-4 shadow-sm">
					<div className="text-xs text-gray-500">作品</div>
					<div className="text-2xl font-bold">{artworks.length}</div>
				</div>
				<div className="bg-white rounded-lg p-4 shadow-sm">
					<div className="text-xs text-gray-500">收藏</div>
					<div className="text-2xl font-bold">{favorites.length}</div>
				</div>
				<div className="bg-white rounded-lg p-4 shadow-sm">
					<div className="text-xs text-gray-500">点赞</div>
					<div className="text-2xl font-bold">{likes.length}</div>
				</div>
				<div className="bg-white rounded-lg p-4 shadow-sm">
					<div className="text-xs text-gray-500">隐私</div>
					<div className="text-sm">{hideName ? '名称隐藏' : '名称可见'} / {hideEmail ? '邮箱隐藏' : '邮箱可见'}</div>
				</div>
			</div>

			<Tabs value={activeTab} onValueChange={setTab} className="w-full">
				<TabsList className="grid w-full grid-cols-3 max-w-lg mb-8">
					<TabsTrigger value="works">我的作品</TabsTrigger>
					<TabsTrigger value="favorites">我的收藏</TabsTrigger>
					<TabsTrigger value="likes">我的点赞</TabsTrigger>
				</TabsList>

				<TabsContent value="works">
					{!loading && artworks.length === 0 ? (
						<div className="text-center py-16 bg-white rounded-lg border">
							<h3 className="text-lg font-semibold mb-2">发布你的第一件作品</h3>
							<p className="text-gray-500 mb-4">在社区中展示你的灵感与创作</p>
							<Link href="/artwork"><Button variant="primary" size="sm">前往创作</Button></Link>
						</div>
					) : (
						<ArtworkGrid artworks={artworks} loading={loading} onLike={handleLike} onFavorite={handleFavorite} />
					)}
				</TabsContent>
				<TabsContent value="favorites">
					{!loading && favorites.length === 0 ? (
						<div className="text-center py-16 bg-white rounded-lg border">
							<h3 className="text-lg font-semibold mb-2">还没有收藏</h3>
							<p className="text-gray-500 mb-4">去看看社区里正在流行的精彩作品</p>
							<div className="flex items-center justify-center gap-3">
								<Link href="/feed"><Button variant="primary" size="sm">推荐 Feed</Button></Link>
								<Link href="/trending"><Button variant="outline" size="sm">热点推荐</Button></Link>
							</div>
						</div>
					) : (
						<ArtworkGrid artworks={favorites} loading={loading} onLike={handleLike} onFavorite={handleFavorite} />
					)}
				</TabsContent>
				<TabsContent value="likes">
					{!loading && likes.length === 0 ? (
						<div className="text-center py-16 bg-white rounded-lg border">
							<h3 className="text-lg font-semibold mb-2">还没有点赞</h3>
							<p className="text-gray-500 mb-4">发现并点赞你喜欢的作品</p>
							<div className="flex items-center justify-center gap-3">
								<Link href="/feed"><Button variant="primary" size="sm">去发现</Button></Link>
								<Link href="/trending"><Button variant="outline" size="sm">看看热门</Button></Link>
							</div>
						</div>
					) : (
						<ArtworkGrid artworks={likes} loading={loading} onLike={handleLike} onFavorite={handleFavorite} />
					)}
				</TabsContent>
			</Tabs>
		</div>
	)
}
