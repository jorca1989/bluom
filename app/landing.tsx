import React from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';
import { useUser } from '@clerk/clerk-expo';
import { MASTER_ADMINS } from '../convex/permissions';
import { Link } from 'expo-router';

// Standard HTML Landing Page for Web
export default function LandingPage() {
    // If we're on native, we don't render this (handled by app/index.tsx)
    if (Platform.OS !== 'web') {
        return null;
    }

    // Static assets correctly resolved by Metro
    const logoSrc = require('../assets/images/logo.png');
    const { user } = useUser();
    const currentEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    const isMasterAdmin = currentEmail && MASTER_ADMINS.map(e => e.toLowerCase()).includes(currentEmail);

    return (
        <>
            <Head>
                <title>Bluom | Precision in Living</title>
                <meta name="description" content="Precision Living. Power in Bloom." />
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Outfit:wght@700;900&display=swap" rel="stylesheet" />
            </Head>

            <div className="bg-[#ebf1fe] text-[#1e293b] min-h-screen font-sans selection:bg-blue-200 overflow-y-auto">
                <style dangerouslySetInnerHTML={{
                    __html: `
            body { margin: 0; background-color: #ebf1fe !important; }
            .font-outfit { font-family: 'Outfit', sans-serif; }
            .font-inter { font-family: 'Inter', sans-serif; }
            html { scroll-behavior: smooth; background-color: #ebf1fe; }
            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: #ebf1fe; }
            ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          `}} />

                {/* Navigation */}
                <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/70 border-b border-blue-100">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <img src={logoSrc} alt="Bluom Logo" className="h-10 w-auto" />

                        <nav className="hidden md:flex items-center space-x-10 text-sm font-bold tracking-tight text-slate-600">
                            <a href="#fuel" className="hover:text-[#2563eb] transition-colors">Fuel</a>
                            <a href="#move" className="hover:text-[#5fc660] transition-colors">Move</a>
                            <a href="#wellness" className="hover:text-[#ef8a34] transition-colors">Wellness</a>
                            <a href="#shop" className="hover:text-[#2563eb] transition-colors">Shop</a>
                            {isMasterAdmin && (
                                <Link href={"/admin" as any} className="text-[#2563eb] font-black hover:text-blue-700 transition-colors border-l border-blue-100 pl-8 ml-8">
                                    ADMIN
                                </Link>
                            )}
                        </nav>

                        <div className="flex items-center gap-4">
                            {!user && (
                                <Link href={"/(auth)/login" as any} className="hidden sm:block text-slate-600 font-bold hover:text-[#2563eb] transition-colors px-4">
                                    Sign In
                                </Link>
                            )}
                            <a href="#download" className="bg-[#2563eb] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-blue-200 transition-all transform hover:scale-105">
                                Download App
                            </a>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-6 pt-32 pb-24 space-y-12">
                    {/* Hero Section */}
                    <section className="text-center py-16">
                        <div className="flex justify-center mb-10">
                            <img src={logoSrc} alt="Bluom" className="h-28 md:h-36 w-auto drop-shadow-sm" />
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black font-outfit mb-6 tracking-tight leading-tight text-slate-900">
                            Precision in Living.<br />
                            <span className="text-[#2563eb]">Power in Bloom.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-500 mb-12 max-w-2xl mx-auto font-inter font-medium">
                            Transforming biological data into daily vigor.
                        </p>

                        <div id="download" className="flex flex-wrap items-center justify-center gap-4">
                            <a href="#" className="bg-slate-900 text-white px-8 py-4 rounded-2xl flex items-center gap-3 hover:transform hover:scale-105 transition-all no-underline shadow-xl">
                                <div className="text-left">
                                    <p className="text-[10px] uppercase font-bold opacity-60 m-0">Download on the</p>
                                    <p className="text-xl font-bold font-inter leading-none m-0">App Store</p>
                                </div>
                            </a>
                            <a href="#" className="bg-slate-900 text-white px-8 py-4 rounded-2xl flex items-center gap-3 hover:transform hover:scale-105 transition-all no-underline shadow-xl">
                                <div className="text-left">
                                    <p className="text-[10px] uppercase font-bold opacity-60 m-0">Get it on</p>
                                    <p className="text-xl font-bold font-inter leading-none m-0">Google Play</p>
                                </div>
                            </a>
                        </div>
                    </section>

                    {/* Content Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Fuel Card */}
                        <section id="fuel" className="bg-white rounded-[40px] p-10 md:p-14 shadow-2xl shadow-blue-900/5 border border-white flex flex-col justify-between overflow-hidden relative group">
                            <div className="relative z-10">
                                <span className="text-[#2563eb] text-sm font-black uppercase tracking-widest mb-4 block">Nutrition</span>
                                <h2 className="text-4xl font-black font-outfit mb-6 text-slate-900 leading-tight">See your food differently.</h2>
                                <p className="text-lg text-slate-500 font-inter font-medium leading-relaxed mb-10">
                                    Precision nutrition powered by AI. Snap a photo, unlock the science of your fuel.
                                </p>
                            </div>
                            <div className="aspect-[4/3] rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                <span className="text-blue-200 text-2xl font-black italic tracking-widest">AI SCAN INTERFACE</span>
                            </div>
                        </section>

                        {/* Move Card */}
                        <section id="move" className="bg-white rounded-[40px] p-10 md:p-14 shadow-2xl shadow-blue-900/5 border border-white flex flex-col justify-between overflow-hidden relative group">
                            <div className="relative z-10">
                                <span className="text-[#5fc660] text-sm font-black uppercase tracking-widest mb-4 block">Fitness</span>
                                <h2 className="text-4xl font-black font-outfit mb-6 text-slate-900 leading-tight">Vigor in Motion.</h2>
                                <p className="text-lg text-slate-500 font-inter font-medium leading-relaxed mb-10">
                                    Your training, synchronized. From heavy lifting to heart-pumping runs, every move counts.
                                </p>
                            </div>
                            <div className="aspect-[4/3] rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-green-50 transition-colors">
                                <span className="text-green-200 text-2xl font-black italic tracking-widest">WORKOUT DASHBOARD</span>
                            </div>
                        </section>

                        {/* Wellness Card */}
                        <section id="wellness" className="bg-white rounded-[40px] p-10 md:p-14 shadow-2xl shadow-blue-900/5 border border-white flex flex-col justify-between overflow-hidden relative group">
                            <div className="relative z-10">
                                <span className="text-[#ef8a34] text-sm font-black uppercase tracking-widest mb-4 block">Coaching</span>
                                <h2 className="text-4xl font-black font-outfit mb-6 text-slate-900 leading-tight">Equilibrium Refined.</h2>
                                <p className="text-lg text-slate-500 font-inter font-medium leading-relaxed mb-10">
                                    Master your habits. Game-ified wellness for consistency.
                                </p>
                            </div>
                            <div className="aspect-[4/3] rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                                <span className="text-orange-200 text-2xl font-black italic tracking-widest">BLÜMIE TRACKER</span>
                            </div>
                        </section>

                        {/* Shop Card */}
                        <section id="shop" className="bg-white rounded-[40px] p-10 md:p-14 shadow-2xl shadow-blue-900/5 border border-white flex flex-col justify-between overflow-hidden relative group">
                            <div className="relative z-10">
                                <span className="text-[#2563eb] text-sm font-black uppercase tracking-widest mb-4 block">Precision Gear</span>
                                <h2 className="text-4xl font-black font-outfit mb-6 text-slate-900 leading-tight">Elite Performance Store.</h2>
                                <p className="text-lg text-slate-500 font-inter font-medium leading-relaxed mb-10">
                                    Curated supplements and activewear designed for the high-performance life.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 aspect-[4/3]">
                                <div className="bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 transition-colors">
                                    <span className="text-blue-100 text-xs font-bold uppercase tracking-widest">Supplements</span>
                                </div>
                                <div className="bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 transition-colors">
                                    <span className="text-blue-100 text-xs font-bold uppercase tracking-widest">Activewear</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Full Width Dashboard Preview */}
                    <section className="bg-slate-900 rounded-[60px] p-10 md:p-20 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-6xl font-black font-outfit text-white mb-8 tracking-tight">One Dashboard.<br />Total Control.</h2>
                            <div className="max-w-4xl mx-auto aspect-video rounded-3xl bg-white/5 border border-white/10 backdrop-blur-3xl flex items-center justify-center">
                                <span className="text-white/10 text-4xl font-black uppercase tracking-[0.2em] italic">Full Experience</span>
                            </div>
                        </div>
                    </section>
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-blue-100 pt-24 pb-12 px-6">
                    <div className="max-w-7xl mx-auto text-center">
                        <img src={logoSrc} alt="Bluom" className="h-14 w-auto mx-auto mb-10" />
                        <div className="flex justify-center gap-12 text-slate-400 text-xs font-black uppercase tracking-widest mb-16">
                            <a href="#" className="hover:text-[#2563eb] transition-colors">Privacy</a>
                            <a href="#" className="hover:text-[#2563eb] transition-colors">Terms</a>
                            <a href="#" className="hover:text-[#2563eb] transition-colors">Support</a>
                            <a href="#" className="hover:text-[#2563eb] transition-colors">Contact</a>
                        </div>
                        <p className="text-slate-300 text-[10px] font-bold uppercase tracking-[0.3em]">
                            © 2025 Bluom Precision Technology
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
