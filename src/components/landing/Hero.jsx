"use client";
import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Play } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      
      {/* Background Lighting Effect (The "Linear Glow") */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-500/20 rounded-[100%] blur-[120px] -z-10" />

      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
        
        {/* Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-indigo-300 font-mono mb-8 backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          v2.0 Now Available
          <ChevronRight size={12} />
        </motion.div>

        {/* Main Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl"
        >
          Track Every Move. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-gray-500">
            Achieve Every Goal.
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed"
        >
          The ultimate activity tracker to help you stay motivated, consistent, and connected. 
          Experience the future of personal growth.
        </motion.p>

        {/* Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 mb-20"
        >
          <button className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-200 transition-all flex items-center gap-2">
            Get the App <ChevronRight size={18} />
          </button>
          <button className="px-8 py-4 rounded-full font-bold text-lg text-gray-300 hover:text-white border border-white/10 hover:bg-white/5 transition-all flex items-center gap-2">
            <Play size={18} fill="currentColor" /> Watch Demo
          </button>
        </motion.div>

        {/* 3D Screenshot Carousel Placeholder */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative w-full max-w-5xl"
        >
          {/* This is the container for the "App Screenshot" */}
          <div className="relative rounded-t-3xl border border-white/10 bg-[#0B0C0E] shadow-2xl overflow-hidden aspect-[16/9]">
            {/* Mockup UI Header */}
            <div className="h-12 border-b border-white/10 bg-white/5 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
              <div className="w-3 h-3 rounded-full bg-green-500/20" />
            </div>
            
            {/* Placeholder for the actual app carousel */}
            <div className="flex items-center justify-center h-full bg-gradient-to-b from-black to-gray-900">
               <span className="text-gray-500 font-mono text-sm">[ Carousel of 5 App Screenshots ]</span>
               {/* Note: You would replace this <span> with an <Image /> component later */}
            </div>

            {/* Reflection Overlay for "Glass" look */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
          </div>
          
          {/* Glow under the screenshot */}
          <div className="absolute -inset-4 bg-indigo-500/20 blur-3xl -z-10 rounded-full opacity-50" />
        </motion.div>

      </div>
    </section>
  );
}