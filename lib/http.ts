export function json(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});}
export async function readInput(request:Request):Promise<Record<string,unknown>> {
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new Error('Request not allowed.');
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('Expected JSON.');
 const text=await request.text();if(text.length>4096)throw new Error('Request too large.');
 const input=JSON.parse(text);if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid request.');return input;
}
