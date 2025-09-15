import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';

export const Admin = () => {
  return (
    <Layout>
      <Navigation />
      <div className="pt-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Admin page - Coming soon</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};