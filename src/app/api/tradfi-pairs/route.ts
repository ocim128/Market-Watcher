import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

function decodeEscapes(value: string): string {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )
}

function parseTradFiPairs(fileContent: string): string[] {
  const lines = fileContent
    .split(/\r?\n/)
    .map(line => decodeEscapes(line.trim()))
    .filter(Boolean)

  const unique: string[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    if (seen.has(line)) {
      continue
    }
    seen.add(line)
    unique.push(line)
  }

  return unique
}

async function readTradFiPairFile(): Promise<string[]> {
  const filePath = path.join(process.cwd(), 'archieve', 'tradfi-pair.txt')
  const content = await fs.readFile(filePath, 'utf-8')
  return parseTradFiPairs(content)
}

export async function GET() {
  try {
    const pairs = await readTradFiPairFile()
    return Response.json(
      { pairs },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' } }
    )
  } catch (error) {
    console.error('Failed to load TradFi pairs:', error)
    return Response.json({ error: 'Failed to load TradFi pairs', pairs: [] }, { status: 500 })
  }
}
