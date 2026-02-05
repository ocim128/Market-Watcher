const BYBIT_TRADFI_KLINE_URL = 'https://www.bybit.com/x-api/fapi/copymt5/kline'

export const runtime = 'nodejs'

function parseLimit(value: string | null): number {
  const parsed = Number(value || '200')
  if (!Number.isFinite(parsed)) {
    return 200
  }
  return Math.max(1, Math.min(200, Math.floor(parsed)))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const interval = searchParams.get('interval')
    const limit = parseLimit(searchParams.get('limit'))
    const to = searchParams.get('to')

    if (!symbol || !interval) {
      return Response.json(
        { ret_code: 10001, ret_msg: 'symbol and interval are required' },
        { status: 400 }
      )
    }

    const upstreamParams = new URLSearchParams({
      timeStamp: Date.now().toString(),
      symbol,
      interval,
      limit: limit.toString(),
    })

    if (to) {
      upstreamParams.set('to', to)
    }

    const upstream = await fetch(`${BYBIT_TRADFI_KLINE_URL}?${upstreamParams.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    const contentType = upstream.headers.get('content-type') || 'application/json'
    const body = await upstream.text()

    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('TradFi kline proxy failed:', error)
    return Response.json(
      { ret_code: 10002, ret_msg: 'TradFi proxy request failed' },
      { status: 500 }
    )
  }
}
