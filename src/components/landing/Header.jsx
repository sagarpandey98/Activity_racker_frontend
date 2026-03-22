"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detect scroll to add glass effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "Goals", href: "#goals" },
    { name: "Sharee", href: "#share" },
    { name: "Pricing", href: "#pricing" },
  ];

  return (
    <header 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-black/50 backdrop-blur-xl border-b border-white/10" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="font-bold text-xl tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-extrabold">A</span>
          </div>
          <span>ActivityPro</span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* CTA Button */}
        <div className="hidden md:block">
          <button className="bg-white text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-200 transition-all">
            Download Now
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-16 left-0 w-full bg-black border-b border-white/10 p-6 flex flex-col gap-4"
        >
          {navLinks.map((link) => (
            <a key={link.name} href={link.href} className="text-gray-300 text-lg">
              {link.name}
            </a>
          ))}
          <button className="bg-white text-black w-full py-3 rounded-lg font-bold mt-4">
            Download Now
          </button>
        </motion.div>
      )}
    </header>
  );
}