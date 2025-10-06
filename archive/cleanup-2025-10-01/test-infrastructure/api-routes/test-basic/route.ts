export async function GET() {
  return new Response('basic-test-ok', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}

export const runtime = 'edge'