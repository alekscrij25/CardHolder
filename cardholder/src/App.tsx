import { useEffect, useMemo, useState } from 'react'
import { Search, Heart, ArrowUpDown, CreditCard, ShieldCheck, Menu, X, LogIn, LogOut, Plus, Pencil, Trash2, GitCompareArrows, WalletCards, Sparkles } from 'lucide-react'
import { configured, supabase } from './supabase'

type BankCard = {
  id: string; name: string; bank: string; kind: string; network: string
  cashback: string; fee: string; color: string; description: string; featured?: boolean
}
type Profile = { id: string; email: string; is_admin: boolean }

const demoCards: BankCard[] = [
  {id:'demo-1',name:'Black',bank:'Т-Банк',kind:'Дебетовая',network:'МИР',cashback:'до 5%',fee:'0–99 ₽/мес.',color:'black',description:'Дебетовая карта для повседневных покупок. Условия в каталоге приведены как демонстрационный пример.',featured:true},
  {id:'demo-2',name:'СберКарта',bank:'СберБанк',kind:'Дебетовая',network:'МИР',cashback:'по программе',fee:'зависит от условий',color:'green',description:'Пример дебетовой карты с бонусной программой.',featured:true},
  {id:'demo-3',name:'Альфа-Карта',bank:'Альфа-Банк',kind:'Дебетовая',network:'МИР',cashback:'по категориям',fee:'по тарифу',color:'red',description:'Пример дебетовой карты с категориями вознаграждений.'},
  {id:'demo-4',name:'Платинум',bank:'Т-Банк',kind:'Кредитная',network:'МИР',cashback:'по программе',fee:'по тарифу',color:'silver',description:'Пример кредитной карты. Перед оформлением важно изучить ставку, льготный период и полную стоимость кредита.'},
  {id:'demo-5',name:'Премиум',bank:'СберБанк',kind:'Премиальная',network:'МИР',cashback:'по программе',fee:'по тарифу',color:'emerald',description:'Пример премиального обслуживания и дополнительных привилегий.'},
  {id:'demo-6',name:'Travel',bank:'Альфа-Банк',kind:'Премиальная',network:'МИР',cashback:'мили / бонусы',fee:'по тарифу',color:'blue',description:'Демонстрационный пример карты для путешествий.'}
]

function App() {
  const [cards,setCards] = useState<BankCard[]>(demoCards)
  const [profile,setProfile] = useState<Profile|null>(null)
  const [favorites,setFavorites] = useState<string[]>([])
  const [query,setQuery] = useState('')
  const [kind,setKind] = useState('Все типы')
  const [sort,setSort] = useState('Популярные')
  const [page,setPage] = useState<'catalog'|'favorites'|'compare'|'admin'>('catalog')
  const [compare,setCompare] = useState<string[]>([])
  const [modal,setModal] = useState<'auth'|'edit'|'details'|null>(null)
  const [selected,setSelected] = useState<BankCard|null>(null)
  const [authMode,setAuthMode] = useState<'login'|'signup'>('login')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [notice,setNotice] = useState('')
  const [busy,setBusy] = useState(false)
  const [mobileOpen,setMobileOpen] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({data}) => { if(data.session) loadProfile(data.session.user.id, data.session.user.email || '') })
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session) => {
      if(session) loadProfile(session.user.id,session.user.email || '')
      else { setProfile(null); setFavorites([]) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(id:string, mail:string) {
    if (!supabase) return
    const {data} = await supabase.from('profiles').select('id,email,is_admin').eq('id',id).maybeSingle()
    setProfile(data ? data as Profile : {id,email:mail,is_admin:false})
    const {data: favs} = await supabase.from('favorites').select('card_id').eq('user_id',id)
    setFavorites((favs || []).map((f:any)=>f.card_id))
  }

  async function loadCards() {
    if (!supabase) return
    const {data,error} = await supabase.from('cards').select('*').order('created_at',{ascending:false})
    if(!error && data?.length) setCards(data.map((c:any)=>({...c,color:c.color || 'blue'})))
  }
  useEffect(()=>{ loadCards() },[])

  const visible = useMemo(()=>{
    let result = cards.filter(c => (page==='favorites' ? favorites.includes(c.id) : page==='compare' ? compare.includes(c.id) : true))
      .filter(c => `${c.name} ${c.bank} ${c.kind}`.toLowerCase().includes(query.toLowerCase()))
      .filter(c => kind==='Все типы' || c.kind===kind)
    if(sort==='По названию') result=[...result].sort((a,b)=>a.name.localeCompare(b.name,'ru'))
    if(sort==='По банку') result=[...result].sort((a,b)=>a.bank.localeCompare(b.bank,'ru'))
    return result
  },[cards,page,favorites,compare,query,kind,sort])

  async function authSubmit(e:React.FormEvent) {
    e.preventDefault()
    if(!supabase){setNotice('Сначала подключи Supabase по инструкции в README.md.');return}
    setBusy(true);setNotice('')
    const result = authMode==='signup'
      ? await supabase.auth.signUp({email,password})
      : await supabase.auth.signInWithPassword({email,password})
    setBusy(false)
    if(result.error) setNotice(result.error.message)
    else if(authMode==='signup') setNotice('Проверь почту: Supabase может отправить письмо для подтверждения регистрации.')
    else {setModal(null);setPassword('')}
  }
  async function logout(){await supabase?.auth.signOut();setPage('catalog')}
  async function toggleFavorite(id:string){
    if(!profile || !supabase){setNotice('Войди в аккаунт, чтобы сохранять избранное.');setModal('auth');return}
    if(favorites.includes(id)){
      await supabase.from('favorites').delete().eq('card_id',id).eq('user_id',profile.id)
      setFavorites(favorites.filter(x=>x!==id))
    } else {
      const {error}=await supabase.from('favorites').insert({card_id:id,user_id:profile.id})
      if(!error)setFavorites([...favorites,id])
    }
  }
  function toggleCompare(id:string){setCompare(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<3?[...prev,id]:prev)}
  function openDetails(card:BankCard){setSelected(card);setModal('details')}
  function openEdit(card?:BankCard){setSelected(card || {id:'',name:'',bank:'',kind:'Дебетовая',network:'МИР',cashback:'',fee:'',color:'blue',description:''});setModal('edit')}
  async function saveCard(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); if(!supabase || !profile?.is_admin){setNotice('Для управления каталогом нужна роль администратора.');return}
    const fd=new FormData(e.currentTarget)
    const payload={name:String(fd.get('name')),bank:String(fd.get('bank')),kind:String(fd.get('kind')),network:String(fd.get('network')),cashback:String(fd.get('cashback')),fee:String(fd.get('fee')),color:String(fd.get('color')),description:String(fd.get('description'))}
    const result=selected?.id ? await supabase.from('cards').update(payload).eq('id',selected.id) : await supabase.from('cards').insert(payload)
    if(result.error){setNotice(result.error.message);return}
    setModal(null);await loadCards()
  }
  async function deleteCard(id:string){
    if(!supabase || !profile?.is_admin || !confirm('Удалить эту карту из каталога?'))return
    const {error}=await supabase.from('cards').delete().eq('id',id)
    if(error)setNotice(error.message);else await loadCards()
  }

  const title = page==='favorites'?'Избранное':page==='compare'?'Сравнение карт':page==='admin'?'Управление каталогом':'Каталог банковских карт'
  return <div className="app-shell">
    <header className="topbar"><div className="container nav">
      <button className="brand" onClick={()=>setPage('catalog')}><span className="brand-icon"><WalletCards size={20}/></span>CardHolder</button>
      <nav className={mobileOpen?'nav-links open':'nav-links'}>
        <button className={page==='catalog'?'nav-item active':'nav-item'} onClick={()=>{setPage('catalog');setMobileOpen(false)}}>Каталог</button>
        <button className={page==='favorites'?'nav-item active':'nav-item'} onClick={()=>{setPage('favorites');setMobileOpen(false)}}>Избранное</button>
        <button className={page==='compare'?'nav-item active':'nav-item'} onClick={()=>{setPage('compare');setMobileOpen(false)}}>Сравнение <span className="count">{compare.length}</span></button>
        {profile?.is_admin && <button className="nav-item" onClick={()=>{setPage('admin');setMobileOpen(false)}}>Администрирование</button>}
      </nav>
      <div className="nav-right">{profile ? <><span className="user-email">{profile.email}</span><button className="icon-button" title="Выйти" onClick={logout}><LogOut size={17}/></button></> : <button className="login-btn" onClick={()=>{setModal('auth');setNotice('')}}><LogIn size={16}/> Войти</button>}
      <button className="mobile-toggle" onClick={()=>setMobileOpen(!mobileOpen)}>{mobileOpen?<X/>:<Menu/>}</button></div>
    </div></header>

    <main className="container">
      {page==='catalog' && <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><Sparkles size={14}/> УМНЫЙ КАТАЛОГ БАНКОВСКИХ КАРТ</div><h1>Выбирай карту<br/><span>с умом.</span></h1><p>Сравнивай условия, изучай возможности и сохраняй интересные предложения в одном месте.</p>
          <div className="hero-actions"><button className="btn-primary" onClick={()=>document.getElementById('catalog')?.scrollIntoView({behavior:'smooth'})}>Смотреть карты <span>↗</span></button><div className="trust-note"><ShieldCheck size={16}/> Безопасный каталог без платёжных данных</div></div>
        </div>
        <div className="hero-visual"><div className="glow"></div><div className="hero-card"><div className="card-top"><span>CardHolder</span><span className="card-chip">◈</span></div><div className="sim-chip"></div><div className="hero-number">•••• &nbsp; •••• &nbsp; •••• &nbsp; 2048</div><div className="card-bottom"><span>DEMO MEMBER</span><b>PREMIUM</b></div></div><div className="floating-pill"><span className="live-dot"></span> Твой финансовый навигатор</div></div>
      </section>}
      {page==='catalog' && <div className="quick-stats"><div><b>{cards.length.toString().padStart(2,'0')}</b><span>Карты в каталоге</span></div><div><b>{new Set(cards.map(c=>c.bank)).size.toString().padStart(2,'0')}</b><span>Банков</span></div><div><b>{favorites.length.toString().padStart(2,'0')}</b><span>В избранном</span></div></div>}
      <section id="catalog" className="catalog-section">
        <div className="section-heading"><div><div className="eyebrow">CARD COLLECTION</div><h2>{title}</h2><p>{page==='compare'?'Выбери до трёх карт, чтобы сопоставить условия.':page==='favorites'?'Твои сохранённые предложения.':'Найди подходящую карту среди доступных предложений.'}</p></div>
          {profile?.is_admin && page!=='compare' && <button className="btn-primary compact" onClick={()=>openEdit()}><Plus size={16}/> Добавить карту</button>}
        </div>
        <div className="filters"><label className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск по названию или банку..."/></label>
          <select value={kind} onChange={e=>setKind(e.target.value)}><option>Все типы</option><option>Дебетовая</option><option>Кредитная</option><option>Премиальная</option></select>
          <select value={sort} onChange={e=>setSort(e.target.value)}><option>Популярные</option><option>По названию</option><option>По банку</option></select>
        </div>
        {page==='compare' && compare.length>0 && <div className="compare-hint"><GitCompareArrows size={17}/> Выбрано карт: {compare.length} из 3. Нажми «Убрать из сравнения», чтобы удалить карту.</div>}
        {page==='admin' && <div className="notice-box">Добавляй только проверенную публичную информацию о банковских продуктах. Для демонстрационных записей условия отмечай как пример.</div>}
        <div className="card-grid">
          {visible.map(card=><article className="product-card" key={card.id}>
            <div className={`bank-card ${card.color}`}><div className="bank-card-head"><span>{card.bank.toUpperCase()}</span><span className="network">{card.network}</span></div><div className="card-sim"></div><div className="masked-number">•••• &nbsp; •••• &nbsp; •••• &nbsp; {card.id.slice(-4).toUpperCase()}</div><div className="bank-card-foot"><small>{card.kind.toUpperCase()}</small><b>{card.name}</b></div></div>
            <div className="product-content"><div className="product-title"><div><h3>{card.name}</h3><p>{card.bank}</p></div><span className="type-pill">{card.kind}</span></div>
              <div className="metrics"><div><span>Кешбэк / бонусы</span><b>{card.cashback}</b></div><div><span>Обслуживание</span><b>{card.fee}</b></div></div>
              <div className="product-actions"><button className="details-btn" onClick={()=>openDetails(card)}>Подробнее</button><button className={favorites.includes(card.id)?'small-action saved':'small-action'} title="Избранное" onClick={()=>toggleFavorite(card.id)}><Heart size={17} fill={favorites.includes(card.id)?'currentColor':'none'}/></button><button className={compare.includes(card.id)?'small-action selected':'small-action'} title="Сравнить" onClick={()=>toggleCompare(card.id)}><GitCompareArrows size={17}/></button></div>
              {profile?.is_admin && <div className="admin-actions"><button onClick={()=>openEdit(card)}><Pencil size={14}/> Изменить</button><button onClick={()=>deleteCard(card.id)}><Trash2 size={14}/> Удалить</button></div>}
            </div>
          </article>)}
          {visible.length===0 && <div className="empty-state"><CreditCard size={28}/><b>Здесь пока пусто</b><span>Измени фильтры или добавь карты в каталог.</span></div>}
        </div>
      </section>
    </main>
    <footer><div className="container footer-inner"><div className="brand"><span className="brand-icon"><WalletCards size={18}/></span>CardHolder</div><p>Независимый каталог для изучения и сравнения банковских карт.</p><small>CardHolder не является банком и не оформляет финансовые продукты. Условия могут меняться — проверяй их на официальных сайтах банков. Не вводи на этом сайте номера карт, CVV, PIN-коды или пароли.</small><div className="footer-bottom">© 2026 CardHolder · Информационный проект</div></div></footer>

    {modal && <div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><div className="modal">
      <div className="modal-head"><h2>{modal==='auth'?(authMode==='login'?'Вход в аккаунт':'Создать аккаунт'):modal==='edit'?(selected?.id?'Редактировать карту':'Добавить карту'):selected?.name}</h2><button className="icon-button" onClick={()=>setModal(null)}><X size={18}/></button></div>
      {modal==='auth' && <form onSubmit={authSubmit} className="form">
        <p className="muted">Аккаунт нужен для синхронизации избранного между устройствами.</p>
        <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label>
        <label>Пароль<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Не менее 8 символов"/></label>
        <button className="btn-primary full" disabled={busy}>{busy?'Подождите…':authMode==='login'?'Войти':'Зарегистрироваться'}</button>
        <button type="button" className="text-button" onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setNotice('')}}>{authMode==='login'?'Нет аккаунта? Зарегистрироваться':'Уже есть аккаунт? Войти'}</button>
        {!configured && <div className="notice-box">Подключение базы данных ещё не настроено. Следуй шагам в README.md.</div>}
        {notice && <div className="notice-box">{notice}</div>}
      </form>}
      {modal==='details' && selected && <div className="details-modal"><p className="muted">{selected.bank} · {selected.kind}</p><p>{selected.description}</p><div className="detail-row"><span>Платёжная система</span><b>{selected.network}</b></div><div className="detail-row"><span>Кешбэк / бонусы</span><b>{selected.cashback}</b></div><div className="detail-row"><span>Обслуживание</span><b>{selected.fee}</b></div><div className="notice-box">Информация может быть неполной или устаревшей. Перед оформлением сверяй тарифы, комиссии и ограничения на официальном сайте банка.</div></div>}
      {modal==='edit' && selected && <form className="form" onSubmit={saveCard}>
        {(['name','bank','kind','network','cashback','fee','color','description'] as const).map(field=><label key={field}>{({name:'Название карты',bank:'Банк',kind:'Тип карты',network:'Платёжная система',cashback:'Кешбэк / бонусы',fee:'Обслуживание',color:'Цвет карточки',description:'Описание'} as any)[field]}{field==='kind'?<select name={field} defaultValue={selected.kind}><option>Дебетовая</option><option>Кредитная</option><option>Премиальная</option></select>:field==='color'?<select name={field} defaultValue={selected.color}><option value="blue">Синий</option><option value="black">Тёмный</option><option value="green">Зелёный</option><option value="red">Красный</option><option value="silver">Серебристый</option><option value="emerald">Изумрудный</option></select>:field==='description'?<textarea name={field} defaultValue={selected.description} rows={3}/>:<input name={field} required defaultValue={(selected as any)[field]}/>}</label>)}
        <button className="btn-primary full">Сохранить</button>
      </form>}
    </div></div>}
    {notice && modal!=='auth' && <div className="toast" onClick={()=>setNotice('')}>{notice} <X size={14}/></div>}
    {!configured && <div className="dev-badge">DEMO MODE · база данных не подключена</div>}
  </div>
}
export default App
