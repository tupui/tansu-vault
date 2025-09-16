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
          <h1 className="text-4xl font-bold text-foreground">Treasury Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Overview of the Tansu treasury vault system
          </p>
        </div>

        {/* Overall Vault Statistics - Only 4 quadrants */}
        <VaultStats />
      </div>
    </Layout>
  );
};

export default Dashboard;