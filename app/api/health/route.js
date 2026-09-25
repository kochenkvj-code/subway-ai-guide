export async function GET() {
  return Response.json({
    ok: true,
    service: 'subway-ai-guide',
    message: 'Vercel server route is working.',
  });
}
