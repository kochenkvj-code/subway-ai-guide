import {RealtimeClient} from '@supabase/realtime-js';
export async function connectInterpreter({room,token,changed,status}){
 const response=await fetch('/api/interpreter-test?room='+encodeURIComponent(room)+'&realtime=1',{cache:'no-store',headers:{Authorization:'Bearer '+token}});
 const config=await response.json();
 if(!response.ok||!config.ok)throw Error('realtime-unavailable');
 const client=new RealtimeClient(config.url.replace(/\/$/,'')+'/realtime/v1',{params:{apikey:config.key}});
 const channel=client.channel(config.topic,{config:{private:true,broadcast:{self:false}}});
 channel.on('broadcast',{event:'changed'},changed).subscribe(state=>status(state==='SUBSCRIBED'));
 return {close(){client.removeChannel(channel);client.disconnect();}};
}
