import React from 'react';
import HoraVargaChart from '../components/HoraVargaChart';

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-4">
      <div className="container mx-auto">
        <HoraVargaChart />
      </div>
    </main>
  );
}