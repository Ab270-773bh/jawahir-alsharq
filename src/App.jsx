import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, UserRound, Menu, X, ArrowLeft, Plus, Minus, Trash2, Heart, Instagram, Send, MessageCircle, ShieldCheck, Package, LogOut, ChevronLeft, ChevronRight, Sparkles, SlidersHorizontal } from 'lucide-react';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey && !supabaseUrl.includes('YOUR_PROJECT')
  ? createClient(supabaseUrl, supabaseKey) : null;
const demoProducts = [
  {id:'demo-1',name:'مجموعة العناية اليومية',category:'العناية والجمال',price_syp:180000,price_usd:18,description:'مجموعة مختارة للعناية اليومية بمظهر أنيق.',usage:'اقرأ تعليمات الشركة المصنّعة على العبوة قبل الاستخدام. جرّب المنتج على مساحة صغيرة عند الحاجة.',images:['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1000&q=85','https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=1000&q=85'],featured:true,stock:12},
  {id:'demo-2',name:'عطر شرقي أنيق',category:'العطور',price_syp:250000,price_usd:25,description:'رائحة مميزة بتقديم أنيق، مناسبة للهدايا والمناسبات.',usage:'يرش على البشرة أو الملابس من مسافة مناسبة بعد مراجعة تعليمات المنتج.',images:['https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85','https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85'],featured:true,stock:8},
  {id:'demo-3',name:'كريم ترطيب يومي',category:'العناية والجمال',price_syp:95000,price_usd:9.5,description:'خيار يومي بسيط لترطيب البشرة ضمن روتين العناية.',usage:'استخدم وفق تعليمات العبوة، وتوقف عن الاستخدام عند حدوث تهيّج.',images:['https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=1000&q=85'],featured:false,stock:20},
  {id:'demo-4',name:'علبة هدية فاخرة',category:'هدايا',price_syp:120000,price_usd:12,description:'تغليف مرتب يجعل هديتك أجمل من اللحظة الأولى.',usage:'تحفظ في مكان جاف بعيداً عن الحرارة والرطوبة.',images:['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1000&q=85'],featured:false,stock:15}
];
const money = (n, currency) => currency === 'USD'
  ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(n)||0)
  : `${new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(n)||0)} ل.س`;
const asImages = p => Array.isArray(p.images) && p.images.length ? p.images : (p.image_url ? [p.image_url] : []);
const envLinks = {
  whatsapp: import.meta.env.VITE_STORE_WHATSAPP || '',
  instagram: import.meta.env.VITE_STORE_INSTAGRAM || '',
  telegram: import.meta.env.VITE_STORE_TELEGRAM || ''
};

function App(){
  const [products,setProducts] = useState(demoProducts);
  const [loading,setLoading] = useState(true);
  const [currency,setCurrency] = useState('SYP');
  const [search,setSearch] = useState('');
  const [category,setCategory] = useState('الكل');
  const [selected,setSelected] = useState(null);
  const [cart,setCart] = useState(()=>{try{return JSON.parse(localStorage.getItem('jawahir-cart')||'[]')}catch{return[]}});
  const [cartOpen,setCartOpen] = useState(false);
  const [authOpen,setAuthOpen] = useState(false);
  const [adminOpen,setAdminOpen] = useState(false);
  const [user,setUser] = useState(null);
  const [profile,setProfile] = useState(null);
  const [orders,setOrders] = useState([]);
  const [toast,setToast] = useState('');
  const [mobileMenu,setMobileMenu] = useState(false);
  const [favorites,setFavorites] = useState([]);
  const [links,setLinks] = useState(envLinks);
  const [adminEmail,setAdminEmail] = useState('');
  const [adminPassword,setAdminPassword] = useState('');
  const [adminMode,setAdminMode] = useState(false);

  useEffect(()=>{localStorage.setItem('jawahir-cart',JSON.stringify(cart))},[cart]);
  useEffect(()=>{
    let active=true;
    async function init(){
      if(!supabase){setLoading(false);return}
      const {data:{session}}=await supabase.auth.getSession();
      if(session?.user){setUser(session.user); await loadProfile(session.user)}
      await loadProducts();
      const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
        setUser(session?.user||null);
        if(session?.user) setTimeout(()=>loadProfile(session.user),0);
        else {setProfile(null);setOrders([]);setAdminMode(false)}
      });
      if(active)setLoading(false);
      return ()=>subscription.unsubscribe();
    }
    init();
    return ()=>{active=false};
  },[]);
  async function loadProducts(){
    if(!supabase)return;
    const {data,error}=await supabase.from('products').select('*').eq('active',true).order('created_at',{ascending:false});
    if(!error && data) setProducts(data.length?data:[]);
  }
  async function loadProfile(u){
    if(!supabase||!u)return;
    const {data}=await supabase.from('profiles').select('*').eq('id',u.id).maybeSingle();
    setProfile(data||null);
    const {data:ods}=await supabase.from('orders').select('id,status,total_syp,total_usd,created_at,order_items(*)').eq('user_id',u.id).order('created_at',{ascending:false});
    setOrders(ods||[]);
  }
  function notify(msg){setToast(msg);setTimeout(()=>setToast(''),3000)}
  const categories=useMemo(()=>['الكل',...new Set(products.map(p=>p.category).filter(Boolean))],[products]);
  const filtered=useMemo(()=>products.filter(p=>(category==='الكل'||p.category===category)&&(`${p.name} ${p.category||''} ${p.description||''}`).toLowerCase().includes(search.toLowerCase())),[products,category,search]);
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const totalSyp=cart.reduce((s,i)=>s+(Number(i.price_syp)||0)*i.qty,0);
  const totalUsd=cart.reduce((s,i)=>s+(Number(i.price_usd)||0)*i.qty,0);
  function addToCart(p,qty=1){setCart(old=>{const found=old.find(i=>i.id===p.id);return found?old.map(i=>i.id===p.id?{...i,qty:i.qty+qty}:i):[...old,{...p,qty}]});notify('تمت إضافة المنتج إلى السلة')}
  function updateQty(id,delta){setCart(old=>old.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+delta)}:i))}
  function removeCart(id){setCart(old=>old.filter(i=>i.id!==id))}
  function contactUrl(type,product){
    const msg=encodeURIComponent(`مرحباً، أريد الاستفسار عن: ${product?.name||'منتج من جواهر الشرق'}${product?`\nالسعر: ${money(product.price_syp,'SYP')} / ${money(product.price_usd,'USD')}`:''}${product?`\nرابط المنتج: ${location.origin}/#product=${product.id}`:''}`);
    if(type==='whatsapp'){
      const raw=links.whatsapp.replace(/\D/g,'');
      return raw?`https://wa.me/${raw}?text=${msg}`:'';
    }
    if(type==='instagram')return links.instagram;
    return links.telegram;
  }
  async function signOut(){if(supabase)await supabase.auth.signOut();setUser(null);setProfile(null);setAdminMode(false);notify('تم تسجيل الخروج')}
  async function resetPassword(email){
    if(!supabase){notify('اربط Supabase أولاً لتفعيل استعادة كلمة المرور');return}
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin});
    notify(error?error.message:'إذا كان البريد مسجلاً فستصلك رسالة استعادة كلمة المرور');
  }
  async function signIn(email,password,signup=false){
    if(!supabase){notify('وضع العرض التجريبي: أضف إعدادات Supabase لتفعيل الحسابات');return}
    const res=signup?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});
    if(res.error){notify(res.error.message);return}
    if(signup&&!res.data.session)notify('تحقق من بريدك الإلكتروني لإكمال التسجيل');
    else {setUser(res.data.user);setAuthOpen(false);notify('تم تسجيل الدخول')}
  }
  async function submitOrder(form){
    if(!supabase){notify('الطلبات الحقيقية تحتاج إعداد قاعدة بيانات Supabase');return}
    if(!user){setAuthOpen(true);notify('سجّل الدخول أولاً لحفظ طلبك');return}
    if(!cart.length){notify('السلة فارغة');return}
    const {data:order,error}=await supabase.from('orders').insert({user_id:user.id,status:'new',customer_name:form.name,phone:form.phone,address:form.address,notes:form.notes||'',total_syp:totalSyp,total_usd:totalUsd}).select().single();
    if(error){notify(error.message);return}
    const items=cart.map(i=>({order_id:order.id,product_id:i.id,product_name:i.name,quantity:i.qty,unit_price_syp:i.price_syp,unit_price_usd:i.price_usd}));
    const {error:itemErr}=await supabase.from('order_items').insert(items);
    if(itemErr){notify('تم إنشاء الطلب لكن تعذر حفظ بعض التفاصيل. تواصل مع الدعم.');return}
    setCart([]);setCartOpen(false);await loadProfile(user);notify('تم إرسال طلبك بنجاح');
  }

  return <div className="app-shell">
    <div className="announcement"><Sparkles size={14}/> جواهر الشرق — تفاصيل صغيرة، فرق كبير <span>تسوّق بأناقة</span></div>
    <header className="header">
      <button className="icon-btn mobile-only" onClick={()=>setMobileMenu(!mobileMenu)} aria-label="القائمة">{mobileMenu?<X/>:<Menu/>}</button>
      <a className="brand" href="#" onClick={()=>{setSelected(null);setAdminOpen(false)}}><div className="brand-mark">ج</div><div><strong>جواهر الشرق</strong><small>اختيارات تليق بك</small></div></a>
      <nav className={mobileMenu?'nav nav-open':'nav'}>
        <a href="#shop" onClick={()=>{setSelected(null);setMobileMenu(false)}}>المتجر</a>
        <a href="#featured" onClick={()=>{setCategory('الكل');setMobileMenu(false)}}>منتجات مميزة</a>
        <a href="#about" onClick={()=>setMobileMenu(false)}>من نحن</a>
        <button className="nav-admin" onClick={()=>{setAdminOpen(true);setSelected(null);setMobileMenu(false)}}>لوحة الإدارة</button>
      </nav>
      <div className="header-actions">
        <label className="currency-select"><span>العملة</span><select value={currency} onChange={e=>setCurrency(e.target.value)}><option value="SYP">ل.س</option><option value="USD">USD</option></select></label>
        <button className="icon-btn" onClick={()=>setAuthOpen(true)} aria-label="حسابي"><UserRound/></button>
        <button className="icon-btn bag-button" onClick={()=>setCartOpen(true)} aria-label="السلة"><ShoppingBag/><i>{cartCount}</i></button>
      </div>
    </header>

    {adminOpen ? <AdminPanel supabase={supabase} products={products} reload={loadProducts} user={user} profile={profile} setProfile={setProfile} onClose={()=>setAdminOpen(false)} notify={notify} links={links} setLinks={setLinks} onAdmin={()=>setAdminMode(true)} adminMode={adminMode} adminEmail={adminEmail} setAdminEmail={setAdminEmail} adminPassword={adminPassword} setAdminPassword={setAdminPassword} signIn={signIn} resetPassword={resetPassword} signOut={signOut}/> :
    selected ? <ProductDetail product={selected} currency={currency} addToCart={addToCart} onBack={()=>setSelected(null)} contactUrl={contactUrl} notify={notify}/> :
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span></span> اختيارات مختارة بعناية</div>
          <h1>الجمال في التفاصيل،<br/><em>والتميّز في اختيارك.</em></h1>
          <p>اكتشف مجموعة من المنتجات المختارة بعناية، بتجربة تسوّق بسيطة وأنيقة من جواهر الشرق.</p>
          <div className="hero-buttons"><a className="btn btn-dark" href="#shop">اكتشف المجموعة <ArrowLeft size={17}/></a><a className="text-link" href="#about">حكاية جواهر الشرق</a></div>
          <div className="hero-proof"><span><ShieldCheck size={17}/> تجربة تسوّق سهلة</span><span><Package size={17}/> تفاصيل واضحة لكل منتج</span></div>
        </div>
        <div className="hero-art"><div className="hero-orbit orbit-one"></div><div className="hero-orbit orbit-two"></div><motion.div className="hero-image" initial={{opacity:0,y:22,rotate:2}} animate={{opacity:1,y:0,rotate:0}} transition={{duration:.8}}><img src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1100&q=90" alt="منتجات مختارة" /></motion.div><div className="floating-note"><Sparkles size={16}/><span>ذوقك يبدأ من هنا</span></div><div className="hero-number">01 <span>—</span> SELECTED</div></div>
      </section>
      <section className="benefits"><div><span className="benefit-icon">✧</span><p><b>اختيارات بعناية</b><small>منتجات نختارها لك</small></p></div><div><span className="benefit-icon">◇</span><p><b>تفاصيل واضحة</b><small>صور ووصف وطريقة استخدام</small></p></div><div><span className="benefit-icon">♡</span><p><b>تجربة سهلة</b><small>من التصفح حتى الطلب</small></p></div></section>
      <section className="shop-section" id="shop">
        <div className="section-heading"><div><div className="eyebrow">تصفّح واكتشف</div><h2>تسوّق <em>المجموعة</em></h2><p>اضغط على أي منتج لتعرف تفاصيله كاملة.</p></div><div className="search-box"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن منتج..." /></div></div>
        <div className="category-row"><div className="category-list">{categories.map(c=><button key={c} className={category===c?'category active':'category'} onClick={()=>setCategory(c)}>{c}</button>)}</div><span className="product-count"><SlidersHorizontal size={15}/> {filtered.length} منتجات</span></div>
        {loading?<div className="loading">جارٍ تحميل المنتجات...</div>:filtered.length?<motion.div layout className="product-grid">{filtered.map((p,i)=><ProductCard key={p.id} product={p} currency={currency} index={i} onOpen={()=>setSelected(p)} favorite={favorites.includes(p.id)} onFavorite={()=>setFavorites(old=>old.includes(p.id)?old.filter(x=>x!==p.id):[...old,p.id])}/>)}</motion.div>:<div className="empty-state">لا توجد منتجات مطابقة حالياً.</div>}
      </section>
      <section className="feature-banner" id="featured"><div><div className="eyebrow">اختيارنا لك</div><h2>منتجات تستحق<br/><em>أن تكون أقرب إليك.</em></h2><p>تصفّح التفاصيل والصور وطريقة الاستخدام قبل اتخاذ قرارك.</p><a className="btn btn-light" href="#shop">شاهد المنتجات <ArrowLeft size={17}/></a></div><div className="banner-decoration">ج</div></section>
      <section className="about-section" id="about"><div className="about-symbol">ج</div><div><div className="eyebrow">حكاية جواهر الشرق</div><h2>اختيار جميل،<br/><em>وتجربة أهدأ.</em></h2><p>نؤمن أن التسوّق الجيد يبدأ بمعلومات واضحة وصور حقيقية وتجربة سهلة. اختر المنتج، اقرأ تفاصيله، ثم تواصل معنا بالطريقة التي تناسبك.</p></div></section>
    </main>}
    <footer className="footer"><a className="brand footer-brand" href="#"><div className="brand-mark">ج</div><div><strong>جواهر الشرق</strong><small>اختيارات تليق بك</small></div></a><p>تجربة تسوّق أنيقة، من أول نظرة حتى آخر تفصيل.</p><div className="footer-social">{links.whatsapp&&<a href={contactUrl('whatsapp')} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle/></a>}{links.instagram&&<a href={links.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram/></a>}{links.telegram&&<a href={links.telegram} target="_blank" rel="noreferrer" aria-label="Telegram"><Send/></a>}</div><small>© {new Date().getFullYear()} جواهر الشرق</small></footer>

    <AnimatePresence>{cartOpen&&<Drawer title={`سلة المشتريات (${cartCount})`} onClose={()=>setCartOpen(false)}><CartContent cart={cart} currency={currency} updateQty={updateQty} removeCart={removeCart} totalSyp={totalSyp} totalUsd={totalUsd} user={user} onLogin={()=>{setCartOpen(false);setAuthOpen(true)}} onSubmit={submitOrder} notify={notify}/></Drawer>}</AnimatePresence>
    <AnimatePresence>{authOpen&&<Modal title={user?'حسابك الشخصي':'أهلاً بك في جواهر الشرق'} onClose={()=>setAuthOpen(false)}><AuthContent user={user} signIn={signIn} resetPassword={resetPassword} signOut={signOut} orders={orders}/></Modal>}</AnimatePresence>
    <AnimatePresence>{toast&&<motion.div className="toast" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}>{toast}</motion.div>}</AnimatePresence>
  </div>
}

function ProductCard({product,currency,index,onOpen,favorite,onFavorite}){
  const images=asImages(product);
  return <motion.article className="product-card" layout initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{delay:Math.min(index*.06,.3)}} whileHover={{y:-5}}>
    <button className="product-image" onClick={onOpen} aria-label={`عرض ${product.name}`}><img src={images[0]||'https://placehold.co/600x700?text=Jawahir'} alt={product.name}/>{product.featured&&<span className="featured-tag">اختيار مميز</span>}<span className="image-count">{images.length>1?`${images.length} صور`:''}</span><span className="view-product">اكتشف المنتج <ArrowLeft size={15}/></span></button>
    <div className="product-meta"><span>{product.category||'منتجات مختارة'}</span><button className={favorite?'favorite active':'favorite'} onClick={e=>{e.stopPropagation();onFavorite()}} aria-label="إضافة للمفضلة"><Heart size={17} fill={favorite?'currentColor':'none'}/></button></div>
    <button className="product-name" onClick={onOpen}>{product.name}</button><div className="product-bottom"><strong>{money(currency==='USD'?product.price_usd:product.price_syp,currency)}</strong><button onClick={onOpen} className="round-arrow" aria-label="تفاصيل المنتج"><ArrowLeft size={17}/></button></div>
  </motion.article>
}
function ProductDetail({product,currency,addToCart,onBack,contactUrl,notify}){
  const images=asImages(product);const [active,setActive]=useState(0);const [qty,setQty]=useState(1);
  return <main className="detail-page"><button className="back-link" onClick={onBack}><ArrowLeft size={17}/> العودة إلى المتجر</button><div className="detail-grid"><div className="detail-gallery"><div className="detail-main-image"><img src={images[active]} alt={product.name}/>{images.length>1&&<><button className="gallery-prev" onClick={()=>setActive((active-1+images.length)%images.length)} aria-label="الصورة السابقة"><ChevronRight/></button><button className="gallery-next" onClick={()=>setActive((active+1)%images.length)} aria-label="الصورة التالية"><ChevronLeft/></button></>}</div>{images.length>1&&<div className="thumb-row">{images.map((im,i)=><button key={im+i} className={active===i?'thumb active':'thumb'} onClick={()=>setActive(i)}><img src={im} alt={`${product.name} ${i+1}`}/></button>)}</div>}</div><div className="detail-info"><div className="eyebrow">{product.category||'من جواهر الشرق'}</div><h1>{product.name}</h1><div className="detail-price">{money(currency==='USD'?product.price_usd:product.price_syp,currency)}</div><p className="detail-description">{product.description||'تفاصيل المنتج ستضاف قريباً.'}</p><div className="detail-rule"></div><h3>طريقة الاستخدام</h3><p className="usage-text">{product.usage||'يرجى مراجعة تعليمات الشركة المصنّعة على العبوة قبل الاستخدام.'}</p>{product.stock!=null&&<p className="stock-note">{Number(product.stock)>0?`متوفر حالياً (${product.stock})`:'غير متوفر حالياً'}</p>}<div className="detail-actions"><div className="qty-control"><button onClick={()=>setQty(Math.max(1,qty-1))}><Minus size={15}/></button><span>{qty}</span><button onClick={()=>setQty(qty+1)}><Plus size={15}/></button></div><button className="btn btn-dark add-button" disabled={product.stock===0} onClick={()=>addToCart(product,qty)}>أضف إلى السلة <ShoppingBag size={17}/></button></div><div className="contact-product"><p>تحتاج إلى مساعدة بخصوص المنتج؟</p><div className="contact-buttons">{contactUrl('whatsapp',product)&&<a href={contactUrl('whatsapp',product)} target="_blank" rel="noreferrer" className="contact-btn whatsapp"><MessageCircle size={17}/> WhatsApp</a>}{contactUrl('instagram',product)&&<a href={contactUrl('instagram',product)} target="_blank" rel="noreferrer" className="contact-btn"><Instagram size={17}/> Instagram</a>}{contactUrl('telegram',product)&&<a href={contactUrl('telegram',product)} target="_blank" rel="noreferrer" className="contact-btn"><Send size={17}/> Telegram</a>}{!contactUrl('whatsapp',product)&&!contactUrl('instagram',product)&&!contactUrl('telegram',product)&&<span className="muted-small">سيتم عرض وسائل التواصل بعد إعداد روابط المتجر.</span>}</div></div></div></div></main>
}
function Drawer({title,onClose,children}){return <motion.div className="overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><motion.aside className="drawer" initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'tween',duration:.25}}><div className="drawer-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X/></button></div>{children}</motion.aside></motion.div>}
function CartContent({cart,currency,updateQty,removeCart,totalSyp,totalUsd,user,onLogin,onSubmit,notify}){
 const [checkout,setCheckout]=useState(false);const [form,setForm]=useState({name:'',phone:'',address:'',notes:''});
 if(!cart.length)return <div className="cart-empty"><ShoppingBag size={38}/><h3>سلتك تنتظر اختيارك</h3><p>تصفّح المنتجات وأضف ما يعجبك.</p></div>;
 return <div className="cart-content"><div className="cart-items">{cart.map(i=><div className="cart-item" key={i.id}><img src={asImages(i)[0]} alt={i.name}/><div className="cart-item-info"><b>{i.name}</b><strong>{money(currency==='USD'?i.price_usd*i.qty:i.price_syp*i.qty,currency)}</strong><div className="qty-control small"><button onClick={()=>updateQty(i.id,-1)}><Minus size={12}/></button><span>{i.qty}</span><button onClick={()=>updateQty(i.id,1)}><Plus size={12}/></button></div></div><button className="remove-btn" onClick={()=>removeCart(i.id)} aria-label="حذف"><Trash2 size={16}/></button></div>)}</div><div className="cart-summary"><div><span>المجموع التقريبي</span><strong>{money(currency==='USD'?totalUsd:totalSyp,currency)}</strong></div><small>قد تختلف تكاليف التوصيل حسب المنطقة.</small>{!checkout?<button className="btn btn-dark full-btn" onClick={()=>user?setCheckout(true):onLogin()}>متابعة الطلب <ArrowLeft size={17}/></button>:<form className="checkout-form" onSubmit={e=>{e.preventDefault();onSubmit(form)}}><h3>بيانات التوصيل</h3><input required placeholder="الاسم الكامل" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input required placeholder="رقم الهاتف" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><textarea required placeholder="العنوان بالتفصيل" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/><textarea placeholder="ملاحظات إضافية (اختياري)" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/><button className="btn btn-dark full-btn">تأكيد الطلب</button></form>}</div></div>
}
function Modal({title,onClose,children}){return <motion.div className="overlay centered-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><motion.div className="modal" initial={{opacity:0,y:18,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10}}><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X/></button></div>{children}</motion.div></motion.div>}
function AuthContent({user,signIn,resetPassword,signOut,orders}){
 const [mode,setMode]=useState('login');const [email,setEmail]=useState(user?.email||'');const [password,setPassword]=useState('');
 if(user)return <div className="account-content"><div className="account-badge"><UserRound/></div><h3>{user.email}</h3><p className="muted-small">حسابك في جواهر الشرق</p><h4>طلباتي السابقة</h4>{orders.length?orders.map(o=><div className="order-row" key={o.id}><div><b>طلب #{String(o.id).slice(0,8)}</b><small>{new Date(o.created_at).toLocaleDateString('ar')}</small></div><span className="order-status">{o.status}</span><strong>{money(o.total_syp,'SYP')}</strong></div>):<p className="muted-small">لا توجد طلبات محفوظة بعد.</p>}<button className="btn btn-outline full-btn" onClick={signOut}><LogOut size={16}/> تسجيل الخروج</button></div>;
 return <div className="auth-content"><div className="auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>تسجيل الدخول</button><button className={mode==='signup'?'active':''} onClick={()=>setMode('signup')}>إنشاء حساب</button></div><form onSubmit={e=>{e.preventDefault();if(mode==='reset')resetPassword(email);else signIn(email,password,mode==='signup')}}><label>البريد الإلكتروني</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/>{mode!=='reset'&&<><label>كلمة المرور</label><input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="6 أحرف على الأقل"/></>}{mode==='reset'&&<p className="muted-small">سنرسل رابط استعادة إلى بريدك الإلكتروني إذا كان مسجلاً.</p>}<button className="btn btn-dark full-btn">{mode==='signup'?'إنشاء الحساب':mode==='reset'?'إرسال رابط الاستعادة':'تسجيل الدخول'}</button></form><button className="forgot-link" onClick={()=>setMode(mode==='reset'?'login':'reset')}>{mode==='reset'?'العودة لتسجيل الدخول':'نسيت كلمة المرور؟'}</button><p className="auth-note">بيانات حسابك محمية عبر خدمة المصادقة بعد إعداد قاعدة البيانات.</p></div>
}

function AdminPanel({supabase,products,reload,user,profile,setProfile,onClose,notify,links,setLinks,onAdmin,adminMode,adminEmail,setAdminEmail,adminPassword,setAdminPassword,signIn,resetPassword,signOut}){
 const blank={name:'',category:'',price_syp:'',price_usd:'',description:'',usage:'',imagesText:'',stock:'0',featured:false,active:true};
 const [form,setForm]=useState(blank);const [editing,setEditing]=useState(null);const [busy,setBusy]=useState(false);const [tab,setTab]=useState('products');const [allOrders,setAllOrders]=useState([]);const [uploading,setUploading]=useState(false);
 const isAdmin=!!profile?.is_admin;
 useEffect(()=>{if(supabase&&user&&isAdmin)loadOrders()},[user,isAdmin]);
 async function loadOrders(){const {data}=await supabase.from('orders').select('*,order_items(*)').order('created_at',{ascending:false});setAllOrders(data||[])}
 async function saveProduct(e){
  e.preventDefault();if(!supabase){notify('أضف إعدادات Supabase أولاً');return}if(!isAdmin){notify('ليس لديك صلاحية الإدارة');return}
  const imgs=form.imagesText.split('\n').map(x=>x.trim()).filter(Boolean);
  const row={name:form.name,category:form.category,price_syp:Number(form.price_syp)||0,price_usd:Number(form.price_usd)||0,description:form.description,usage:form.usage,images:imgs,stock:Number(form.stock)||0,featured:!!form.featured,active:!!form.active};
  setBusy(true);const res=editing?await supabase.from('products').update(row).eq('id',editing):await supabase.from('products').insert(row);
  setBusy(false);if(res.error){notify(res.error.message);return}notify('تم حفظ المنتج');setForm(blank);setEditing(null);reload();
 }
 function editProduct(p){setEditing(p.id);setForm({name:p.name||'',category:p.category||'',price_syp:p.price_syp??'',price_usd:p.price_usd??'',description:p.description||'',usage:p.usage||'',imagesText:asImages(p).join('\n'),stock:p.stock??0,featured:!!p.featured,active:p.active!==false});setTab('products');window.scrollTo({top:0,behavior:'smooth'})}
 async function deleteProduct(id){if(!confirm('هل أنت متأكد من حذف المنتج؟'))return;const {error}=await supabase.from('products').update({active:false}).eq('id',id);if(error)notify(error.message);else{notify('تم إخفاء المنتج');reload()}}
 async function uploadImages(files){
  if(!supabase||!isAdmin){notify('تحتاج صلاحية الإدارة وإعداد Supabase');return}
  setUploading(true);const urls=[];
  for(const file of Array.from(files)){
   const path=`${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
   const {data,error}=await supabase.storage.from('product-images').upload(path,file,{upsert:false});
   if(error){notify(`تعذر رفع ${file.name}: ${error.message}`);continue}
   const {data:pub}=supabase.storage.from('product-images').getPublicUrl(data.path);urls.push(pub.publicUrl);
  }
  if(urls.length)setForm(f=>({...f,imagesText:[f.imagesText,...urls].filter(Boolean).join('\n')}));
  setUploading(false);
 }
 async function saveSettings(e){e.preventDefault();if(!supabase||!isAdmin){notify('لا توجد صلاحية إدارة');return}const {error}=await supabase.from('store_settings').upsert({id:1,whatsapp:links.whatsapp,instagram:links.instagram,telegram:links.telegram,updated_at:new Date().toISOString()});if(error)notify(error.message);else notify('تم حفظ الروابط في قاعدة البيانات')}
 async function changeStatus(id,status){const {error}=await supabase.from('orders').update({status}).eq('id',id);if(error)notify(error.message);else{notify('تم تحديث حالة الطلب');loadOrders()}}
 async function makeAdmin(){if(!supabase||!user){notify('سجّل الدخول أولاً');return}const {error}=await supabase.from('profiles').update({is_admin:true}).eq('id',user.id);if(error)notify(error.message);else{const {data}=await supabase.from('profiles').select('*').eq('id',user.id).single();setProfile(data);notify('تم تحديث الحساب')}}

 return <main className="admin-page"><div className="admin-top"><button className="back-link" onClick={onClose}><ArrowLeft size={17}/> العودة للمتجر</button><div className="admin-title"><div className="eyebrow">مساحة خاصة</div><h1>لوحة <em>الإدارة</em></h1><p>إدارة منتجات جواهر الشرق وطلباته وإعداداته.</p></div></div>
 {!supabase?<div className="setup-warning"><ShieldCheck/><div><h3>الموقع يعمل حالياً بوضع العرض التجريبي</h3><p>لجعل تسجيل الدخول والطلبات والإدارة تعمل فعلياً، أنشئ مشروع Supabase وأضف بياناته إلى ملف <code>.env</code> ثم نفّذ ملف <code>supabase/schema.sql</code>. خطوات الإعداد موجودة في README.</p></div></div>:!user?<div className="admin-login panel"><h2>دخول الإدارة</h2><p>استخدم بريدك وكلمة مرور حسابك.</p><form onSubmit={e=>{e.preventDefault();signIn(adminEmail,adminPassword,false)}}><label>البريد الإلكتروني</label><input type="email" required value={adminEmail} onChange={e=>setAdminEmail(e.target.value)}/><label>كلمة المرور</label><input type="password" required value={adminPassword} onChange={e=>setAdminPassword(e.target.value)}/><button className="btn btn-dark full-btn">تسجيل الدخول</button></form><button className="forgot-link" onClick={()=>resetPassword(adminEmail)}>نسيت كلمة المرور؟</button></div>:!isAdmin?<div className="setup-warning"><ShieldCheck/><div><h3>هذا الحساب ليس مديراً</h3><p>لأمان المتجر، لا يمكن للزبائن منح أنفسهم صلاحية الإدارة. يجب تعيين أول مدير يدوياً من لوحة Supabase وفق التعليمات في README.</p><button className="btn btn-outline" onClick={signOut}>تسجيل الخروج</button></div></div>:<>
 <div className="admin-welcome"><span>مرحباً، {user.email}</span><button className="btn btn-outline" onClick={signOut}><LogOut size={15}/> خروج</button></div>
 <div className="admin-tabs"><button className={tab==='products'?'active':''} onClick={()=>setTab('products')}>المنتجات</button><button className={tab==='orders'?'active':''} onClick={()=>setTab('orders')}>الطلبات ({allOrders.length})</button><button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}>التواصل</button></div>
 {tab==='products'&&<div className="admin-layout"><form className="panel admin-product-form" onSubmit={saveProduct}><h2>{editing?'تعديل المنتج':'إضافة منتج جديد'}</h2><div className="form-grid"><label>اسم المنتج<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>القسم<input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>السعر بالليرة السورية<input required type="number" min="0" value={form.price_syp} onChange={e=>setForm({...form,price_syp:e.target.value})}/></label><label>السعر بالدولار<input required type="number" min="0" step="0.01" value={form.price_usd} onChange={e=>setForm({...form,price_usd:e.target.value})}/></label><label>الكمية المتوفرة<input type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label></div><label>وصف المنتج<textarea required rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>طريقة الاستخدام<textarea rows="3" value={form.usage} onChange={e=>setForm({...form,usage:e.target.value})}/></label><label>روابط الصور (رابط في كل سطر)<textarea rows="3" value={form.imagesText} onChange={e=>setForm({...form,imagesText:e.target.value})} placeholder="https://..."/></label><label className="upload-label">أو ارفع عدة صور من هاتفك<input type="file" accept="image/*" multiple onChange={e=>uploadImages(e.target.files)}/>{uploading&&<small>جارٍ رفع الصور...</small>}</label><div className="check-row"><label><input type="checkbox" checked={form.featured} onChange={e=>setForm({...form,featured:e.target.checked})}/> منتج مميز</label><label><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> ظاهر في المتجر</label></div><button className="btn btn-dark full-btn" disabled={busy||uploading}>{busy?'جارٍ الحفظ...':editing?'حفظ التعديلات':'إضافة المنتج'}</button>{editing&&<button type="button" className="btn btn-outline full-btn" onClick={()=>{setEditing(null);setForm(blank)}}>إلغاء التعديل</button>}</form><div className="panel admin-list"><h2>المنتجات الحالية ({products.length})</h2>{products.map(p=><div className="admin-product-row" key={p.id}><img src={asImages(p)[0]} alt=""/><div><b>{p.name}</b><small>{money(p.price_syp,'SYP')} · {money(p.price_usd,'USD')}</small></div><button className="btn btn-outline" onClick={()=>editProduct(p)}>تعديل</button><button className="remove-btn" onClick={()=>deleteProduct(p.id)}><Trash2 size={16}/></button></div>)}</div></div>}
 {tab==='orders'&&<div className="panel order-admin"><h2>طلبات الزبائن</h2>{allOrders.length?allOrders.map(o=><div className="order-admin-row" key={o.id}><div><b>طلب #{String(o.id).slice(0,8)}</b><small>{o.customer_name} · {o.phone}</small><small>{o.address}</small><small>{(o.order_items||[]).map(i=>`${i.product_name} × ${i.quantity}`).join('، ')}</small></div><strong>{money(o.total_syp,'SYP')} / {money(o.total_usd,'USD')}</strong><select value={o.status} onChange={e=>changeStatus(o.id,e.target.value)}><option value="new">جديد</option><option value="confirmed">مؤكد</option><option value="preparing">قيد التجهيز</option><option value="shipped">تم الشحن</option><option value="completed">مكتمل</option><option value="cancelled">ملغي</option></select></div>):<p className="muted-small">لا توجد طلبات بعد.</p>}</div>}
 {tab==='settings'&&<form className="panel settings-form" onSubmit={saveSettings}><h2>روابط التواصل</h2><p>أدخل روابطك الحقيقية. اترك الحقل فارغاً لإخفاء الزر من واجهة المتجر.</p><label>WhatsApp — رقم مع مفتاح الدولة<input value={links.whatsapp} onChange={e=>setLinks({...links,whatsapp:e.target.value})} placeholder="مثال: 9639XXXXXXXX"/></label><label>Instagram — رابط الحساب<input value={links.instagram} onChange={e=>setLinks({...links,instagram:e.target.value})} placeholder="https://instagram.com/your-account"/></label><label>Telegram — رابط الحساب أو القناة<input value={links.telegram} onChange={e=>setLinks({...links,telegram:e.target.value})} placeholder="https://t.me/your-channel"/></label><button className="btn btn-dark">حفظ إعدادات التواصل</button></form>}
 </>}
 </main>
}

