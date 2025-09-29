'use client';

import React from 'react';
import Link from 'next/link';
import { DatabaseProvider } from '@/contexts/DatabaseContext';
import Dashboard from '@/components/Dashboard';
import { FaChessKnight } from 'react-icons/fa';

export default function DashboardPage() {
  return (
    <DatabaseProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center space-x-2">
                  <FaChessKnight className="text-gray-900" />
                  <h1 className="text-2xl font-bold text-gray-900">Chess Trainer</h1>
                </div>
              </div>
              <nav className="flex space-x-8">
                <Link href="/" className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-500 hover:text-gray-700">Play</Link>
                <Link href="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium transition-colors bg-blue-100 text-blue-700">Dashboard</Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Dashboard />
        </main>

        
      </div>
    </DatabaseProvider>
  );
}


