export async function GET() {
  return new Response('pong-nodejs', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}