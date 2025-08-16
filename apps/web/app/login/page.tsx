export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">登录 / 注册</h1>
        <p className="text-gray-600 text-sm mb-8 text-center">
          目前为展示版本，尚未接入第三方鉴权。点击下方按钮进入模拟登录。
        </p>

        <div className="space-y-3">
          <button className="w-full py-3 rounded-md border border-gray-300 hover:bg-gray-50">使用 Google 登录（占位）</button>
          <button className="w-full py-3 rounded-md border border-gray-300 hover:bg-gray-50">使用 GitHub 登录（占位）</button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          登录即代表同意我们的《服务条款》和《隐私政策》
        </div>
      </div>
    </div>
  )
}


