import { useQuery } from "@tanstack/react-query"
import {
  ArrowUpRightOnBox,
  ShoppingBag,
  Buildings,
  FlyingBox,
  CurrencyDollar,
  Star,
  ChartPie,
  CheckCircle,
  ExclamationCircle,
  DocumentText,
  DocumentSeries,
  User,
  History,
  Envelope,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { sdk } from "@lib/client"
import { useOrders } from "@hooks/api/orders"
import { useCustomers } from "@hooks/api/customers"
import { useSellers } from "@hooks/api/sellers"
import { useVendorRequests } from "@hooks/api/requests"
import { useDefaultCommissionRule } from "@hooks/api/commission"

type ReviewsMetrics = {
  reviews: { id: string }[]
  count?: number
  avg_rating?: number
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

function sevenDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  loading = false,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  color?: "blue" | "green" | "purple" | "orange" | "red" | "yellow"
  loading?: boolean
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    yellow: "bg-amber-50 text-amber-600",
  }

  return (
    <div className="bg-ui-bg-base border border-ui-border-base rounded-xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div>
        {loading ? (
          <div className="h-8 w-24 bg-ui-bg-subtle rounded animate-pulse" />
        ) : (
          <div className="text-2xl font-bold text-ui-fg-base tracking-tight">
            {value}
          </div>
        )}
        <div className="text-sm font-medium text-ui-fg-subtle mt-0.5">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-ui-fg-muted mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  )
}

export const Dashboard = () => {
  const oneWeekAgo = sevenDaysAgo()

  const { orders: allOrders, count: totalOrders, isPending: ordersLoading } = useOrders({ limit: 50, offset: 0 })
  const { count: pendingCount } = useOrders({ status: ["pending"] as HttpTypes.AdminOrderFilters["status"], limit: 1 })
  const { count: completedCount } = useOrders({ status: ["completed"] as HttpTypes.AdminOrderFilters["status"], limit: 1 })
  const { count: newOrdersCount } = useOrders({ created_at: { gte: oneWeekAgo }, limit: 1 })

  const { count: totalCustomers, isPending: customersLoading } = useCustomers({ limit: 1 })
  const { count: newCustomersCount } = useCustomers({ created_at: { gte: oneWeekAgo }, limit: 1 })

  const { count: totalSellers, isPending: sellersLoading } = useSellers({ limit: 1 })
  const { count: newSellersCount } = useSellers({ created_at_from: oneWeekAgo, limit: 1 })

  const { count: pendingRequests } = useVendorRequests({ status: "pending", limit: 1 })

  const { commission_rule: defaultCommission } = useDefaultCommissionRule()

  const { data: productsData, isPending: productsLoading } = useQuery({
    queryKey: ["products-metrics"],
    queryFn: () => sdk.admin.product.list({ limit: 1 }),
  })

  const { data: reviewsData } = useQuery({
    queryKey: ["reviews-metrics"],
    queryFn: () => sdk.client.fetch<ReviewsMetrics>("/admin/reviews", { method: "GET", query: { limit: 1 } }).catch(() => ({ reviews: [], count: 0 })),
  })

  const customerOrderCounts = new Map<string, number>()
  const totalRevenue = (allOrders ?? []).reduce((sum: number, o: HttpTypes.AdminOrder) => {
    const customerId = o.customer_id || ""
    if (customerId) {
      customerOrderCounts.set(customerId, (customerOrderCounts.get(customerId) || 0) + 1)
    }
    return sum + (o.total ?? 0)
  }, 0)

  const avgOrderValue = totalOrders && totalOrders > 0 ? totalRevenue / Math.min(totalOrders, (allOrders ?? []).length) : 0
  const commissionRate = defaultCommission?.percentage_rate ?? 10
  const commissionEarned = totalRevenue * (commissionRate / 100)

  const sampleOrders = (allOrders ?? []).length || 1
  const conversionRate = totalCustomers ? Math.min(100, (sampleOrders / Math.max(totalCustomers, 1)) * 100) : 0
  const repeatBuyers = Array.from(customerOrderCounts.values()).filter((count) => count > 1).length
  const activeBuyers = customerOrderCounts.size || 1
  const repeatPurchaseRate = (repeatBuyers / activeBuyers) * 100
  const churnRate = Math.max(0, 100 - repeatPurchaseRate)

  const metrics: Array<{
    title: string
    value: string | number
    subtitle?: string
    icon: React.ComponentType<{ className?: string }>
    color: "blue" | "green" | "purple" | "orange" | "red" | "yellow"
    loading?: boolean
  }> = [
    {
      title: "Total Revenue (GMV)",
      value: formatCurrency(totalRevenue),
      subtitle: "Gross merchandise value",
      icon: CurrencyDollar,
      color: "green",
      loading: ordersLoading,
    },
    {
      title: "Commission Earned",
      value: formatCurrency(commissionEarned),
      subtitle: `At ${commissionRate}% platform rate`,
      icon: ChartPie,
      color: "purple",
      loading: ordersLoading,
    },
    {
      title: "Avg Order Value",
      value: formatCurrency(avgOrderValue),
      subtitle: "Per transaction",
      icon: ShoppingBag,
      color: "blue",
      loading: ordersLoading,
    },
    {
      title: "Total Orders",
      value: totalOrders?.toLocaleString() ?? "–",
      subtitle: `${newOrdersCount ?? 0} new this week`,
      icon: FlyingBox,
      color: "blue",
      loading: ordersLoading,
    },
    {
      title: "Completed Orders",
      value: completedCount?.toLocaleString() ?? "–",
      subtitle: "Successfully delivered",
      icon: CheckCircle,
      color: "green",
      loading: ordersLoading,
    },
    {
      title: "Pending Orders",
      value: pendingCount?.toLocaleString() ?? "–",
      subtitle: "Awaiting processing",
      icon: History,
      color: "orange",
      loading: ordersLoading,
    },
    {
      title: "Active Sellers",
      value: totalSellers?.toLocaleString() ?? "–",
      subtitle: `${newSellersCount ?? 0} new this week`,
      icon: Buildings,
      color: "purple",
      loading: sellersLoading,
    },
    {
      title: "Total Buyers",
      value: totalCustomers?.toLocaleString() ?? "–",
      subtitle: `${newCustomersCount ?? 0} new this week`,
      icon: User,
      color: "blue",
      loading: customersLoading,
    },
    {
      title: "New Users (7 days)",
      value: (newCustomersCount ?? 0).toLocaleString(),
      subtitle: "Newly registered buyers",
      icon: Envelope,
      color: "green",
      loading: customersLoading,
    },
    {
      title: "Conversion Rate",
      value: `${conversionRate.toFixed(1)}%`,
      subtitle: "Orders vs active buyers sample",
      icon: ChartPie,
      color: "blue",
      loading: ordersLoading || customersLoading,
    },
    {
      title: "Repeat Purchase Rate",
      value: `${repeatPurchaseRate.toFixed(1)}%`,
      subtitle: "Buyers with 2+ orders",
      icon: History,
      color: "green",
      loading: ordersLoading,
    },
    {
      title: "Estimated Churn Rate",
      value: `${churnRate.toFixed(1)}%`,
      subtitle: "Inverse of repeat purchase trend",
      icon: ExclamationCircle,
      color: "orange",
      loading: ordersLoading,
    },
    {
      title: "Active Listings",
      value: productsData?.count?.toLocaleString() ?? "–",
      subtitle: "All published products",
      icon: DocumentSeries,
      color: "yellow",
      loading: productsLoading,
    },
    {
      title: "Pending Seller Requests",
      value: pendingRequests?.toLocaleString() ?? "0",
      subtitle: "Awaiting admin approval",
      icon: ExclamationCircle,
      color: "orange",
      loading: false,
    },
    {
      title: "Total Reviews",
      value: reviewsData?.count?.toLocaleString() ?? "0",
      subtitle: "Across all products",
      icon: Star,
      color: "yellow",
      loading: false,
    },
    {
      title: "Avg Product Rating",
      value: reviewsData?.avg_rating ? `${Number(reviewsData.avg_rating).toFixed(1)} / 5` : "N/A",
      subtitle: "Customer satisfaction",
      icon: Star,
      color: "yellow",
      loading: false,
    },
    {
      title: "Commission Rate",
      value: `${commissionRate}%`,
      subtitle: "Default platform commission",
      icon: DocumentText,
      color: "purple",
      loading: false,
    },
  ]

  return (
    <div className="flex flex-col gap-6 px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">Marketplace Overview</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            14 key performance metrics — updated in real time
          </Text>
        </div>
        <Badge size="2xsmall" color="green">Live</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <Container className="p-6">
        <Heading level="h2" className="mb-4">Quick Actions</Heading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Review Seller Requests", href: "/requests", badge: pendingRequests || 0 },
            { label: "Process Pending Orders", href: "/orders", badge: pendingCount || 0 },
            { label: "Manage Products", href: "/products", badge: 0 },
            { label: "Commission Settings", href: "/commission", badge: 0 },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center justify-between p-4 bg-ui-bg-subtle rounded-lg hover:bg-ui-bg-base-hover border border-ui-border-base transition-colors group"
            >
              <span className="text-sm font-medium text-ui-fg-base group-hover:text-ui-fg-interactive">
                {action.label}
              </span>
              {action.badge > 0 ? (
                <Badge size="2xsmall" color="orange">{action.badge}</Badge>
              ) : (
                <ArrowUpRightOnBox className="w-4 h-4 text-ui-fg-muted" />
              )}
            </a>
          ))}
        </div>
      </Container>
    </div>
  )
}
