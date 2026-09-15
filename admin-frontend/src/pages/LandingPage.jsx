import React, { useState } from 'react';
import {
  Utensils,
  Store,
  Smartphone,
  Printer,
  ShieldCheck,
  Zap,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowRight,
  Download,
  Phone,
  Send,
  Lock,
  Layers,
  Sparkles,
  ChevronRight,
  Globe,
  Database
} from 'lucide-react';

export default function LandingPage({ onGoToAdmin }) {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({ name: '', phone: '', businessType: 'Kafe / Restoran' });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      setDemoSubmitted(false);
      setDemoModalOpen(false);
      setDemoForm({ name: '', phone: '', businessType: 'Kafe / Restoran' });
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-blue-600 selection:text-white font-sans">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-50 bg-slate-900/85 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Zap className="w-6 h-6 fill-white text-white" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white">Get<span className="text-blue-500">POS</span></span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">v3.0</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-300">
            <a href="#features" className="hover:text-white transition">Imkoniyatlar</a>
            <a href="#products" className="hover:text-white transition">Dasturlar</a>
            <a href="#pricing" className="hover:text-white transition">Tariflar</a>
            <a href="#download" className="hover:text-white transition">Yuklab olish</a>
            <a href="#contact" className="hover:text-white transition">Bog'lanish</a>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center space-x-3">
            <a
              href="https://manager.getpos.uz"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition"
            >
              <Store className="w-3.5 h-3.5 text-blue-400" />
              <span>Menejer Kirish</span>
            </a>

            <button
              onClick={onGoToAdmin}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold mb-8">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Kafe, Restoran va Savdo biznesingiz uchun to'liq ekotizim</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.15] max-w-5xl mx-auto">
            Biznesingizni <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">GetPOS</span> bilan oson va aqlli boshqaring
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-normal">
            Kassa (POS) dasturi, Ofitsiant mobil ilovasi, Chek printerlari, Xonalar va stollar xaritasi, Ombor hisobi va Super Admin nazorati — barchasi bir platformada.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setDemoModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-base shadow-xl shadow-blue-600/30 active:scale-95 transition flex items-center justify-center space-x-2"
            >
              <span>🚀 Bepul Demo So'rash</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#download"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-bold text-base transition flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Dasturlarni yuklab olish</span>
            </a>
          </div>

          <div id="features" className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 backdrop-blur-sm">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm mb-1">
                <Zap className="w-4 h-4" />
                <span>100% Offline Rejim</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Internet o'chsa ham kassa va ofitsiantlar to'xtamasdan ishlaydi.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 backdrop-blur-sm">
              <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm mb-1">
                <Printer className="w-4 h-4" />
                <span>Chek Printerlar</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">80mm va 58mm oshxona va kassa termoprinterlarini qo'llab-quvvatlaydi.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 backdrop-blur-sm">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm mb-1">
                <Smartphone className="w-4 h-4" />
                <span>Mobil Ofitsiant</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Stollarga buyurtma olish va kassa bilan real-vaqt sinxronlash.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 backdrop-blur-sm">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm mb-1">
                <Globe className="w-4 h-4" />
                <span>3 Tilda (Lotin / Kirill)</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">O'zbekcha (Lotin & Kirill) va Rus tillarida to'liq interfeys.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRODUCTS & ECOSYSTEM */}
      <section id="products" className="py-24 bg-slate-950 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              GetPOS Ekotizimining Barcha Qismlari
            </h2>
            <p className="mt-4 text-slate-400 text-base">
              Har bir biznes turi uchun maxsus ishlab chiqilgan professional vositalar to'plami
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition group">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Utensils className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">GetPOS Kafe & Restoran</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Stollar va zallar xaritasi, taomlar menyusi, bir nechta ofitsiant hisobi, buyurtma tahrirlash, foiz hisoblash va tezkor chek chiqarish.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-300 font-medium mb-8">
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /><span>Stollar va Zallar (1-zal, 2-zal, VIP)</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /><span>Har bir ofitsiant nomi bilan buyurtma</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /><span>Windows Desktop ilovasi</span></li>
              </ul>
              <a href="#download" className="inline-flex items-center text-xs font-bold text-amber-400 hover:text-amber-300">
                <span>KafePOS ilovasini yuklash</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </a>
            </div>

            <div className="relative p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition group">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Ofitsiant Mobil Ilovasi</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Ofitsiantlar to'g'ridan-to'g'ri stol yonida mijozdan buyurtma oladi, taom sonini o'zgartiradi va oshxonaga uzatadi.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-300 font-medium mb-8">
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" /><span>Tezkor PIN-kod orqali kirish</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" /><span>Stollardagi buyurtmalar holatini jonli ko'rish</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" /><span>Android APK ilovasi</span></li>
              </ul>
              <a href="#download" className="inline-flex items-center text-xs font-bold text-indigo-400 hover:text-indigo-300">
                <span>Mobil ilovani yuklash</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </a>
            </div>

            <div className="relative p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Store className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Menejer & Sklad Paneli</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Do'kon egasi uchun ombor qoldiqlari, kirim-chiqimlar, foyda hisoboti, xodimlar boshqaruvi va mijozlar qarzdorligi monitoringi.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-300 font-medium mb-8">
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /><span>Qarz daftari va avtomatik SMS eslatmalar</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /><span>Grafikli sotuv va foyda tahlili</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /><span>Web orqali istalgan joydan kirish</span></li>
              </ul>
              <a href="https://manager.getpos.uz" target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-bold text-blue-400 hover:text-blue-300">
                <span>Menejer paneliga o'tish</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRICING SECTION */}
      <section id="pricing" className="py-24 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Shaffof va Qulay Tariflar
            </h2>
            <p className="mt-4 text-slate-400 text-base">
              Biznesingiz hajmiga mos tarifni tanlang. Yashirin to'lovlar yo'q.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            <div className="p-8 rounded-3xl bg-slate-800/50 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Kichik Savdo</span>
                <h3 className="text-2xl font-black text-white mt-2">Boshlang'ich</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-black text-white">150,000</span>
                  <span className="text-slate-400 text-sm font-semibold"> so'm / oy</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>1 ta kassa o'rni</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>Sklad va mahsulotlar hisobi</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>Chek printer ulash</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>Telegram orqali yordam</span></li>
                </ul>
              </div>
              <button
                onClick={() => setDemoModalOpen(true)}
                className="mt-8 w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition"
              >Tanlash</button>
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-b from-blue-900/40 to-slate-900 border-2 border-blue-500 relative flex flex-col justify-between shadow-2xl shadow-blue-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white font-extrabold text-[11px] uppercase tracking-wider shadow-md">
                Eng Ommabop
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase text-blue-400 tracking-wider">Kafe & Restoran</span>
                <h3 className="text-2xl font-black text-white mt-2">Standard Kafe</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-black text-white">300,000</span>
                  <span className="text-slate-400 text-sm font-semibold"> so'm / oy</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-200 font-medium">
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /><span>KafePOS Desktop kassa dasturi</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /><span>Ofitsiantlar uchun cheksiz mobil ilova</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /><span>Zallar va Stollar xaritasi</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /><span>Oshxona va Kassa printerlari (80mm/58mm)</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /><span>100% Offline va Online sinxronizatsiya</span></li>
                </ul>
              </div>
              <button
                onClick={() => setDemoModalOpen(true)}
                className="mt-8 w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition active:scale-95"
              >Ulanish va O'rnatish</button>
            </div>

            <div className="p-8 rounded-3xl bg-slate-800/50 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Tarmoq & Franchise</span>
                <h3 className="text-2xl font-black text-white mt-2">Enterprise Pro</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-black text-white">600,000</span>
                  <span className="text-slate-400 text-sm font-semibold"> so'm / oy</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>Ko'p filialli biznes boshqaruvi</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>Markazlashgan Super Admin nazorati</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>Eskiz SMS integratsiyasi</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>24/7 Shaxsiy menejer xizmati</span></li>
                </ul>
              </div>
              <button
                onClick={() => setDemoModalOpen(true)}
                className="mt-8 w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition"
              >Bog'lanish</button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DOWNLOAD SECTION */}
      <section id="download" className="py-24 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Dasturlarni O'rnatish va Yuklab Olish
            </h2>
            <p className="mt-4 text-slate-400 text-base">
              Windows kompyuterlar va Android mobil qurilmalari uchun tayyor o'rnatuvchi fayllar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">GetPOS Kafe Desktop (Windows)</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Kassa kompyuteri va monobloklar uchun 1-klikda to'liq avtomatlashtirilgan o'rnatuvchi fayl (x86, x64, AnyCPU).
                </p>
              </div>
              <a
                href="/downloads/KafePOS_Setup.exe"
                download
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>KafePOS O'rnatgichni Yuklash (.exe)</span>
              </a>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">GetPOS Ofitsiant (Android)</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Ofitsiantlar plansheti yoki smartfonlari uchun qulay va engil Android ilova.
                </p>
              </div>
              <a
                href="/downloads/GetPOS_Waiter.apk"
                download
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>Ofitsiant Ilovasini Yuklash (.apk)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CONTACT & FOOTER */}
      <footer id="contact" className="py-16 bg-slate-900 border-t border-slate-800 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-lg font-black text-white">GetPOS</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                O'zbekistondagi kafe, restoran va savdo nuqtalari uchun eng ishonchli avtomatlashtirish tizimi.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-3">Mahsulotlar</h4>
              <ul className="space-y-2">
                <li><a href="#products" className="hover:text-white transition">Kafe & Restoran POS</a></li>
                <li><a href="#products" className="hover:text-white transition">Ofitsiant Mobil Ilova</a></li>
                <li><a href="https://manager.getpos.uz" className="hover:text-white transition">Menejer Sklad Paneli</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Tariflar</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-3">Bog'lanish</h4>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span>+998 (90) 123-45-67</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  <span>@getpos_support</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-3">Tizim Administratori</h4>
              <p className="text-slate-400 mb-3 text-[11px]">
                Faqat platforma egalari va super adminlar uchun maxsus panel.
              </p>
              <button
                onClick={onGoToAdmin}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition"
              >
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Admin Panelga o'tish</span>
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-slate-500">
            <p>© {new Date().getFullYear()} GetPOS.uz. Barcha huquqlar himoyalangan.</p>
            <div className="flex space-x-4 mt-4 sm:mt-0">
              <button onClick={onGoToAdmin} className="hover:text-slate-400">Super Admin Kirish (/admin-panel)</button>
            </div>
          </div>
        </div>
      </footer>

      {/* DEMO MODAL */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-white mb-2">Bepul Demo Sinov</h3>
            <p className="text-xs text-slate-400 mb-6">
              Ma'lumotlaringizni qoldiring, mutaxassisimiz 15 daqiqa ichida sizga tizimni ko'rsatib, ulab beradi.
            </p>

            {demoSubmitted ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-bounce" />
                <h4 className="text-lg font-bold text-white">Rahmat! So'rovingiz qabul qilindi.</h4>
                <p className="text-xs text-slate-400 mt-2">Tez orada operatorimiz siz bilan bog'lanadi.</p>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Ismingiz</label>
                  <input
                    type="text"
                    required
                    value={demoForm.name}
                    onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                    placeholder="Masalan: Akbar"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Telefon raqamingiz</label>
                  <input
                    type="tel"
                    required
                    value={demoForm.phone}
                    onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Biznes turi</label>
                  <select
                    value={demoForm.businessType}
                    onChange={(e) => setDemoForm({ ...demoForm, businessType: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Kafe / Restoran">Kafe / Restoran</option>
                    <option value="Fast Food / Qahvaxona">Fast Food / Qahvaxona</option>
                    <option value="Chakana Savdo / Magazin">Chakana Savdo / Magazin</option>
                    <option value="Katta Tarmoq">Katta Tarmoq</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setDemoModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition"
                  >
                    Yuborish
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}