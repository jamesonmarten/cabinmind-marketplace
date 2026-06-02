/**
 * CabinMind AI Receptionist — Floating Widget v1
 * Drop-in script: reads window.CabinMindConfig, renders floating chat bubble.
 */
(function () {
  'use strict';

  var cfg = Object.assign({
    agentName:       'Aria',
    businessName:    '',
    businessContext: '',
    primaryColor:    '#10b981',
    bgColor:         '#0f172a',
    position:        'bottom-right',
    greeting:        "Hi there! I'm here to help. How can I assist you today?",
    apiBase:         'https://products.devcabin.tech',
  }, window.CabinMindConfig || {});

  var SIDE  = cfg.position === 'bottom-left' ? 'left' : 'right';
  var API   = (cfg.apiBase || 'https://products.devcabin.tech').replace(/\/$/, '');
  var COLOR = cfg.primaryColor || '#10b981';
  var BG    = cfg.bgColor || '#0f172a';

  function darken(hex, amt) {
    var r = parseInt(hex.slice(1,3),16);
    var g = parseInt(hex.slice(3,5),16);
    var b = parseInt(hex.slice(5,7),16);
    return 'rgb('+[r-amt,g-amt,b-amt].map(function(v){return Math.max(0,v);}).join(',')+')';
  }

  var open=false, messages=[{role:'assistant',content:cfg.greeting}], loading=false, unread=0;
  var bubble,panel,msgList,inputEl,sendBtn,badge,typingEl;

  function injectStyles(){
    if(document.getElementById('cabinmind-widget-styles'))return;
    var s=document.createElement('style');
    s.id='cabinmind-widget-styles';
    s.textContent=[
      '#cabinmind-widget *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
      '#cabinmind-bubble{position:fixed;'+SIDE+':24px;bottom:24px;z-index:2147483646;width:56px;height:56px;border-radius:50%;background:'+COLOR+';box-shadow:0 4px 24px rgba(0,0,0,0.25);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform 0.2s,box-shadow 0.2s;border:none;outline:none;}',
      '#cabinmind-bubble:hover{transform:scale(1.08);box-shadow:0 8px 32px rgba(0,0,0,0.3);}',
      '#cabinmind-bubble svg{width:26px;height:26px;transition:opacity 0.2s;}',
      '#cabinmind-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;min-width:18px;height:18px;border-radius:9px;align-items:center;justify-content:center;padding:0 4px;border:2px solid #fff;display:none;}',
      '#cabinmind-panel{position:fixed;'+SIDE+':16px;bottom:92px;z-index:2147483645;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);border-radius:20px;background:'+BG+';box-shadow:0 24px 80px rgba(0,0,0,0.4);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,0.08);transform:scale(0.92) translateY(16px);opacity:0;pointer-events:none;transition:transform 0.22s cubic-bezier(0.34,1.56,0.64,1),opacity 0.18s ease;}',
      '#cabinmind-panel.cm-open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}',
      '#cabinmind-header{background:'+COLOR+';padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;}',
      '#cabinmind-header .cm-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}',
      '#cabinmind-header .cm-name{color:#fff;font-weight:700;font-size:14px;line-height:1.2;}',
      '#cabinmind-header .cm-status{color:rgba(255,255,255,0.75);font-size:11px;display:flex;align-items:center;gap:4px;}',
      '#cabinmind-header .cm-dot{width:7px;height:7px;border-radius:50%;background:#86efac;}',
      '#cabinmind-header .cm-close{margin-left:auto;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.7);font-size:22px;line-height:1;padding:0;}',
      '#cabinmind-header .cm-close:hover{color:#fff;}',
      '#cabinmind-msgs{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:8px;scroll-behavior:smooth;}',
      '#cabinmind-msgs::-webkit-scrollbar{width:4px;}#cabinmind-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:4px;}',
      '.cm-msg{display:flex;gap:8px;animation:cmFadeUp 0.2s ease forwards;}',
      '.cm-msg.cm-user{flex-direction:row-reverse;}',
      '@keyframes cmFadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}',
      '.cm-bubble{max-width:82%;padding:10px 14px;border-radius:16px;font-size:13.5px;line-height:1.5;color:#f1f5f9;word-break:break-word;}',
      '.cm-bubble.cm-ai{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.08);border-radius:4px 16px 16px 16px;}',
      '.cm-bubble.cm-user-b{background:'+COLOR+';border-radius:16px 4px 16px 16px;color:#fff;}',
      '.cm-aicon{width:28px;height:28px;border-radius:50%;background:'+COLOR+';display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;margin-top:2px;}',
      '.cm-typing{display:flex;align-items:center;gap:4px;padding:10px 14px;}',
      '.cm-typing span{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.35);animation:cmBounce 1.2s infinite;}',
      '.cm-typing span:nth-child(2){animation-delay:0.2s;}.cm-typing span:nth-child(3){animation-delay:0.4s;}',
      '@keyframes cmBounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}',
      '#cabinmind-footer{padding:10px 12px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:8px;align-items:flex-end;flex-shrink:0;}',
      '#cabinmind-input{flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:9px 13px;color:#f1f5f9;font-size:13.5px;resize:none;outline:none;max-height:100px;min-height:38px;line-height:1.4;transition:border-color 0.15s;}',
      '#cabinmind-input::placeholder{color:rgba(255,255,255,0.3);}#cabinmind-input:focus{border-color:'+COLOR+'55;}',
      '#cabinmind-send{width:38px;height:38px;border-radius:10px;background:'+COLOR+';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s;flex-shrink:0;}',
      '#cabinmind-send:hover:not(:disabled){background:'+darken(COLOR,15)+'}',
      '#cabinmind-send:disabled{opacity:0.45;cursor:not-allowed;}',
      '#cabinmind-send svg{fill:white;width:16px;height:16px;}',
      '#cabinmind-branding{text-align:center;font-size:10px;color:rgba(255,255,255,0.2);padding:0 12px 8px;}',
      '#cabinmind-branding a{color:rgba(255,255,255,0.3);text-decoration:none;}',
      '#cabinmind-branding a:hover{color:rgba(255,255,255,0.55);}',
    ].join('');
    document.head.appendChild(s);
  }

  var CHAT_ICON='<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.02 21.58a.5.5 0 0 0 .613.613l4.412-1.418A9.959 9.959 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Z"/></svg>';
  var CLOSE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var SEND_ICON='<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z"/></svg>';

  function build(){
    var wrap=document.createElement('div');wrap.id='cabinmind-widget';

    bubble=document.createElement('button');bubble.id='cabinmind-bubble';
    bubble.setAttribute('aria-label','Open chat');bubble.innerHTML=CHAT_ICON;
    badge=document.createElement('div');badge.id='cabinmind-badge';bubble.appendChild(badge);

    panel=document.createElement('div');panel.id='cabinmind-panel';
    panel.setAttribute('role','dialog');panel.setAttribute('aria-label',escHtml(cfg.agentName)+' chat');

    var hdr=document.createElement('div');hdr.id='cabinmind-header';
    hdr.innerHTML='<div class="cm-avatar">🤖</div><div><div class="cm-name">'+escHtml(cfg.agentName||'Aria')+'</div><div class="cm-status"><span class="cm-dot"></span> Online</div></div><button class="cm-close" aria-label="Close">'+CLOSE_ICON+'</button>';

    msgList=document.createElement('div');msgList.id='cabinmind-msgs';

    var footer=document.createElement('div');footer.id='cabinmind-footer';
    inputEl=document.createElement('textarea');inputEl.id='cabinmind-input';inputEl.placeholder='Type a message…';inputEl.rows=1;
    sendBtn=document.createElement('button');sendBtn.id='cabinmind-send';sendBtn.setAttribute('aria-label','Send');sendBtn.innerHTML=SEND_ICON;
    footer.appendChild(inputEl);footer.appendChild(sendBtn);

    var brand=document.createElement('div');brand.id='cabinmind-branding';
    brand.innerHTML='Powered by <a href="https://products.devcabin.tech?utm_source=widget" target="_blank" rel="noopener">CabinMind</a>';

    panel.appendChild(hdr);panel.appendChild(msgList);panel.appendChild(footer);panel.appendChild(brand);
    wrap.appendChild(bubble);wrap.appendChild(panel);
    document.body.appendChild(wrap);

    renderMessages();

    bubble.addEventListener('click',toggle);
    hdr.querySelector('.cm-close').addEventListener('click',toggle);
    sendBtn.addEventListener('click',submit);
    inputEl.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}});
    inputEl.addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px';});
  }

  function toggle(){
    open=!open;
    if(open){
      panel.classList.add('cm-open');bubble.innerHTML=CLOSE_ICON;
      bubble.setAttribute('aria-label','Close chat');
      unread=0;badge.style.display='none';
      setTimeout(function(){inputEl.focus();},220);
    } else {
      panel.classList.remove('cm-open');
      bubble.innerHTML=CHAT_ICON;bubble.appendChild(badge);
      bubble.setAttribute('aria-label','Open chat');
    }
  }

  function submit(){
    var text=inputEl.value.trim();if(!text||loading)return;
    inputEl.value='';inputEl.style.height='auto';
    pushMsg('user',text);callAPI(text);
  }

  function pushMsg(role,content){
    messages.push({role:role,content:content});renderMessages();
    if(role==='assistant'&&!open){unread++;badge.textContent=unread>9?'9+':unread;badge.style.display='flex';}
  }

  function renderMessages(){
    msgList.innerHTML='';
    messages.forEach(function(m){
      var row=document.createElement('div');row.className='cm-msg'+(m.role==='user'?' cm-user':'');
      if(m.role==='assistant'){
        row.innerHTML='<div class="cm-aicon">🤖</div><div class="cm-bubble cm-ai">'+escHtml(m.content)+'</div>';
      } else {
        row.innerHTML='<div class="cm-bubble cm-user-b">'+escHtml(m.content)+'</div>';
      }
      msgList.appendChild(row);
    });
    scrollBottom();
  }

  function showTyping(){
    typingEl=document.createElement('div');typingEl.className='cm-msg';
    typingEl.innerHTML='<div class="cm-aicon">🤖</div><div class="cm-bubble cm-ai cm-typing"><span></span><span></span><span></span></div>';
    msgList.appendChild(typingEl);scrollBottom();
  }
  function hideTyping(){if(typingEl&&typingEl.parentNode)typingEl.parentNode.removeChild(typingEl);typingEl=null;}
  function scrollBottom(){requestAnimationFrame(function(){msgList.scrollTop=msgList.scrollHeight;});}

  function callAPI(text){
    if(loading)return;loading=true;sendBtn.disabled=true;showTyping();
    var payload=JSON.stringify({
      messages:messages.slice(-20).map(function(m){return{role:m.role,content:m.content};}),
      agentName:cfg.agentName||'Aria',businessName:cfg.businessName||'',businessContext:cfg.businessContext||'',
    });
    var xhr=new XMLHttpRequest();
    xhr.open('POST',API+'/api/chat',true);
    xhr.setRequestHeader('Content-Type','application/json');
    xhr.timeout=30000;
    xhr.onreadystatechange=function(){
      if(xhr.readyState!==4)return;
      hideTyping();loading=false;sendBtn.disabled=false;
      if(xhr.status===200){
        try{var d=JSON.parse(xhr.responseText);pushMsg('assistant',d.reply||d.message||"Sorry, I didn't catch that.");}
        catch(e){pushMsg('assistant',"I'm having trouble. Please try again.");}
      } else if(xhr.status===429){
        pushMsg('assistant',"You've sent a lot of messages! Please wait a moment.");
      } else {
        pushMsg('assistant',"Something went wrong on my end. Please try again.");
      }
    };
    xhr.ontimeout=function(){hideTyping();loading=false;sendBtn.disabled=false;pushMsg('assistant',"That took too long. Please try again.");};
    xhr.onerror=function(){hideTyping();loading=false;sendBtn.disabled=false;pushMsg('assistant',"Can't reach the server right now.");};
    xhr.send(payload);
  }

  function escHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');
  }

  function init(){injectStyles();build();}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();
