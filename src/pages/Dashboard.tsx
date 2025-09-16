import React from 'react';
import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { VaultStats } from '@/components/VaultStats';

const Dashboard: React.FC = () => {
  return (
    <Layout>
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Vault Overview</h1>
          <p className="text-muted-foreground text-lg">
            Total value locked and system-wide vault statistics
          </p>
        </div>

        {/* Overall Vault Statistics - Only 4 quadrants */}
        <VaultStats />
      </div>
    </Layout>
  );
};

export default Dashboard;