"use client";
import React from "react";
import { motion } from "framer-motion";
import { Activity, Zap } from "lucide-react";

const HeroCopy = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white overflow-hidden px-6 font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
        
        {/* Left Side: The Value Prop */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono mb-6">
            <Zap size={14} /> AI-POWERED AUTOMATION
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tighter leading-[1.1]">
            Growth that <br /> 
            <span className="text-emerald-400">Tracks Itself.</span>
          </h1>
          <p className="mt-6 text-gray-400 text-lg max-w-lg leading-relaxed">
            Stop manual logging. Our AI uses your device sensors to track habits, predict burnout, and optimize your schedule—zero effort required.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button className="bg-emerald-500 text-black px-8 py-4 rounded-full font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20">
              Start Free Trial
            </button>
            <button className="border border-gray-700 px-8 py-4 rounded-full font-bold hover:bg-gray-800 transition-all">
              See How It Works
            </button>
          </div>
        </motion.div>

        {/* Right Side: The "Live Feed" Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-gray-900/80 border border-gray-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl"
        >
          <div className="flex gap-1.5 mb-8">
            <div className="w-3 h-3 rounded-full bg-red-500/20" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
            <div className="w-3 h-3 rounded-full bg-green-500/20" />
          </div>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Activity Logged</p>
                <p className="text-xs text-gray-500">45 min Gym Session • via HealthKit</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">AI Prediction</p>
                <p className="text-xs text-gray-500">Peak focus window: 2:00 PM - 4:00 PM</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
              <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">System Status</span>
              <span className="text-[10px] font-mono text-emerald-500 animate-pulse">● Live Syncing</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroCopy;