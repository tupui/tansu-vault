import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Index = () => {
  return (
    <Layout>
      <Navigation />
      
      <div className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32">
          <div className="container mx-auto px-6">
            <motion.div 
              initial={{
                opacity: 0,
                y: 20
              }} 
              animate={{
                opacity: 1,
                y: 0
              }} 
              transition={{
                duration: 0.6
              }} 
              className="text-center max-w-4xl mx-auto space-y-8"
            >
              
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-stellar bg-clip-text text-transparent">Transform Your Treasury</span>
                <br />
                <span className="text-foreground">Into Yield-Generating Assets</span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Connect your Tansu project to our institutional-grade DeFi vault. 
                Earn sustainable returns while maintaining full liquidity and supporting carbon neutrality.
              </p>

              <div className="flex flex-wrap justify-center gap-6 pt-8">
                <Button 
                  size="lg" 
                  className="bg-gradient-stellar text-primary-foreground border-0 glow-stellar hover:shadow-stellar transition-all duration-300 text-lg px-8 py-4" 
                  onClick={() => window.location.href = '/vault'}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 py-4" 
                  onClick={() => window.location.href = '/treasury'}
                >
                  View Treasury
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Index;