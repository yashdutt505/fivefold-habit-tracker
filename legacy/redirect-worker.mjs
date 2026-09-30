const destination='https://fivefold-daily.vercel.app/';
export default {
 async fetch(request) {
  if(request.method!=='GET'&&request.method!=='HEAD')return Response.json({error:'Fivefold has moved. Open '+destination},{status:410,headers:{'Cache-Control':'no-store'}});
  // Do not forward old auth tokens, query parameters or identity headers.
  return new Response(null,{status:302,headers:{Location:destination,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }
};
