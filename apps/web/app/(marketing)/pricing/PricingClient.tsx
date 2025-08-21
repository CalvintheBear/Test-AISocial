"use client"
import { Card, Button, Badge } from '@/components/ui'
import { useMemo, useState } from 'react'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import CreditsBadge from '@/components/CreditsBadge'

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    monthly: 9.99,
    yearly: 95.88,
    currency: 'USD',
    credits: 300,
    productMonthly: 'prod_3DytMxaAcwQWGDEbL0d4eI',
    productYearly: 'prod_54wpsAr6bPuE0RaPGsToUW',
    best: false,
    features: [
      '300 credits/month',
      'All style templates included',
      'Standard generation speed',
      'Basic customer support',
      'JPG/PNG format downloads',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 19.99,
    yearly: 191.88,
    currency: 'USD',
    credits: 1200,
    productMonthly: 'prod_5ujQhBIn1aN14PkF16h92y',
    productYearly: 'prod_2B1IyF8TesaUeCNuLlM8fD',
    best: true,
    features: [
      '1200 credits/month',
      'All style templates included',
      'Priority generation queue',
      'Priority customer support',
      'JPG/PNG/WebP format downloads',
      'Batch generation feature',
      'Image editing tools',
    ],
  },
  {
    id: 'max',
    name: 'Max',
    monthly: 49.99,
    yearly: 479.88,
    currency: 'USD',
    credits: 5000,
    productMonthly: 'prod_5l6w793yJv6MeG8GqrTvJ3',
    productYearly: 'prod_68tgdFA0fAFhFx7giLbwzd',
    best: false,
    features: [
      '5000 credits/month',
      'All style templates included',
      'Fastest generation speed',
      'Dedicated account manager',
      'All format downloads',
      'Batch generation feature',
      'Advanced editing tools',
    ],
  },
]

async function startCheckout(plan: typeof PLANS[number], interval: 'monthly' | 'yearly', amount: number) {
  // 先校验登录状态；未登录则跳转登录页
  try {
    await authFetch(API.me)
  } catch {
    if (typeof window !== 'undefined') {
      window.location.href = `/login?next=/pricing`
    }
    return
  }
  const productId = interval === 'monthly' ? (plan as any).productMonthly : (plan as any).productYearly
  const res = await authFetch<{ id: string; url: string }>(API.payments.checkout, {
    method: 'POST',
    body: JSON.stringify({ packageId: plan.id, credits: plan.credits, amount, currency: plan.currency, interval, productId }),
  })
  const url = (res as any)?.url
  if (url) {
    if (typeof window !== 'undefined') window.location.href = url
  }
}

export default function PricingClient() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const header = useMemo(() => (
    <div className="inline-flex items-center p-1 rounded-full border border-line bg-surface">
      <button
        onClick={() => setBilling('monthly')}
        className={`px-4 py-2 rounded-full text-sm font-medium ${billing === 'monthly' ? 'bg-primary-500 text-white shadow' : 'text-text-2'}`}
      >
        Monthly
      </button>
      <button
        onClick={() => setBilling('yearly')}
        className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${billing === 'yearly' ? 'bg-primary-500 text-white shadow' : 'text-text-2'}`}
      >
        Yearly <span className="text-xs opacity-80">Save 20%</span>
      </button>
    </div>
  ), [billing])

  return (
    <>
      <section className="py-16 bg-grid">
        <div className="container text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">选择适合你的计划</h1>
          <p className="text-text-2 mb-6">购买积分，用于生成高清图像与高级模型</p>
          <div className="mb-6 flex justify-center">{header}</div>
          <CreditsBadge />
        </div>
      </section>

      <section className="py-12">
        <div className="container grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => {
            const original = plan.monthly
            const discounted = Number((plan.yearly / 12).toFixed(2))
            const display = billing === 'monthly' ? original : discounted
            return (
              <Card key={plan.id} className={`p-6 shadow-lg ${plan.best ? 'border-2 border-primary-400' : ''}`}>
                {plan.best && (
                  <div className="mb-2"><Badge className="bg-primary-500 text-white">Most Popular</Badge></div>
                )}
                <div className="text-2xl font-semibold mb-2">{plan.name}</div>
                <div className="mb-1">
                  {billing === 'yearly' && (
                    <span className="text-text-2 line-through mr-2 text-xl">${original.toFixed(2)}</span>
                  )}
                  <span className="text-4xl font-extrabold">${display.toFixed(2)}</span>
                  <span className="text-base font-medium text-text-2">/mo</span>
                </div>
                <p className="text-text-2 mb-4">Ideal for {plan.name === 'Basic' ? 'individuals and light users' : plan.name === 'Pro' ? 'creators and small teams' : 'enterprises and professional teams'}</p>
                <div className="text-sm font-semibold mb-2">Everything in {plan.name === 'Basic' ? 'Basic' : plan.name === 'Pro' ? 'Basic, plus' : 'Pro, plus'}</div>
                <ul className="space-y-2 text-text-2 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="mt-1">✓</span><span>{f}</span></li>
                  ))}
                </ul>
                <Button className="w-full bg-primary-500 hover:bg-primary-600" onClick={() => startCheckout(plan, billing, billing === 'monthly' ? plan.monthly : plan.yearly)}>
                  Get Started
                </Button>
              </Card>
            )
          })}
        </div>
      </section>
    </>
  )
}


