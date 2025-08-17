"use client"

import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">登录 / 注册</h1>
        <div className="flex justify-center">
          <SignIn signUpUrl="/login" routing="path" path="/login" />
        </div>
        <div className="mt-8 text-center text-sm text-gray-500">
          登录即代表同意我们的《服务条款》和《隐私政策》
        </div>
      </div>
    </div>
  )
}


